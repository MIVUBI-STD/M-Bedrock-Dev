import { resolveScriptImports, type ParsedScriptFile } from "../../../analyzers/scripts/src/index.js";
import {
  evaluateSafeConfig,
  type SafeConfigExpression,
  type SafeConfigValue,
} from "../../behavior-model/src/index.js";
import type { SourceRef } from "../../project-model/src/index.js";

export interface ResolvedScriptSafeConfigBinding {
  scriptId: string;
  name: string;
  value: SafeConfigValue;
  source: SourceRef;
}

export interface FailedScriptSafeConfigBinding {
  scriptId: string;
  name: string;
  reason: string;
  source: SourceRef;
}

export interface ScriptArenaCountCandidate {
  scriptId: string;
  name: string;
  value: number;
  source: SourceRef;
}

export interface ScriptArenaLayoutCandidate {
  scriptId: string;
  name: string;
  mode: "absolute-centers" | "relative-offsets";
  points: readonly { x: number; y: number; z: number }[];
  source: SourceRef;
}

export interface ScriptArenaLayout {
  mode: "absolute-centers" | "relative-offsets";
  arenaCount: number;
  canonicalAnchor?: { x: number; y: number; z: number };
  offsets: readonly { x: number; y: number; z: number }[];
  sourceNames: readonly string[];
}

export interface ScriptSafeConfigAnalysis {
  compiledBindings: number;
  rejectedBindings: number;
  crossFileResolvedBindings: number;
  resolvedBindings: readonly ResolvedScriptSafeConfigBinding[];
  failedBindings: readonly FailedScriptSafeConfigBinding[];
  arenaCountCandidates: readonly ScriptArenaCountCandidate[];
  arenaLayoutCandidates: readonly ScriptArenaLayoutCandidate[];
  resolvedArenaCount?: number;
  resolvedArenaLayout?: ScriptArenaLayout;
  arenaCountConflict: boolean;
  arenaLayoutConflict: boolean;
}

const ARENA_COUNT_NAME =
  /^(?:ARENA_COUNT|MAX_ARENAS|MAX_CONCURRENT_ARENAS|MAX_ACTIVE_ARENAS)$/;
const ARENA_ABSOLUTE_LAYOUT_NAME =
  /^(?:ARENA_CENTERS|ARENA_ANCHORS|ARENA_POSITIONS)$/;
const ARENA_OFFSET_LAYOUT_NAME =
  /^ARENA_OFFSETS$/;

function asVector3(
  value: SafeConfigValue,
): { x: number; y: number; z: number } | undefined {
  if (
    value === null ||
    Array.isArray(value) ||
    typeof value !== "object"
  ) return undefined;
  const item = value as Readonly<Record<string, SafeConfigValue>>;
  if (
    typeof item.x !== "number" ||
    !Number.isFinite(item.x) ||
    typeof item.y !== "number" ||
    !Number.isFinite(item.y) ||
    typeof item.z !== "number" ||
    !Number.isFinite(item.z)
  ) {
    return undefined;
  }
  return { x: item.x, y: item.y, z: item.z };
}

function asVectorSeries(
  value: SafeConfigValue,
): { x: number; y: number; z: number }[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const points = value.map(asVector3);
  return points.some((item) => item === undefined)
    ? undefined
    : points as { x: number; y: number; z: number }[];
}

function normalizedLayoutKey(
  candidate: ScriptArenaLayoutCandidate,
): string {
  const first = candidate.points[0]!;
  const normalized =
    candidate.mode === "absolute-centers"
      ? candidate.points.map((point) => ({
          x: point.x - first.x,
          y: point.y - first.y,
          z: point.z - first.z,
        }))
      : candidate.points.map((point) => ({
          x: point.x - first.x,
          y: point.y - first.y,
          z: point.z - first.z,
        }));
  return JSON.stringify(normalized);
}

export function analyzeScriptSafeConfig(
  scripts: readonly ParsedScriptFile[],
): ScriptSafeConfigAnalysis {
  const resolvedBindings: ResolvedScriptSafeConfigBinding[] = [];
  const failedBindings: FailedScriptSafeConfigBinding[] = [];
  const arenaCountCandidates: ScriptArenaCountCandidate[] = [];
  const arenaLayoutCandidates: ScriptArenaLayoutCandidate[] = [];
  const scriptsById = new Map(
    scripts.map((script) => [script.identifier, script]),
  );
  const importResolutions = resolveScriptImports(scripts);
  const importTargetByKey = new Map(
    importResolutions
      .filter(
        (item) =>
          item.status === "resolved" &&
          item.targetIdentifier !== undefined,
      )
      .map((item) => [
        item.fromIdentifier + "|" + item.module,
        item.targetIdentifier!,
      ]),
  );
  const cache = new Map<string, SafeConfigValue>();
  const resolving = new Set<string>();
  let crossFileResolvedBindings = 0;

  const exportedLocalName = (
    script: ParsedScriptFile,
    exportedName: string,
  ): string | undefined =>
    (script.safeConfigExports ?? []).find(
      (item) => item.exportedName === exportedName,
    )?.localName;

  const resolveBindingValue = (
    script: ParsedScriptFile,
    name: string,
  ): SafeConfigValue => {
    const cacheKey = script.identifier + "::" + name;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;
    if (resolving.has(cacheKey)) {
      throw new Error(
        "Cross-file safe config reference cycle includes " +
          cacheKey,
      );
    }

    const binding = (script.safeConfigBindings ?? []).find(
      (item) => item.name === name,
    );
    if (!binding) {
      throw new Error(
        "Unknown safe config binding " +
          name +
          " in " +
          script.identifier,
      );
    }

    resolving.add(cacheKey);
    try {
      const importedNames = new Set(
        (script.safeConfigImports ?? []).map(
          (item) => item.localName,
        ),
      );

      const resolveExpression = (
        expression: SafeConfigExpression,
      ): SafeConfigExpression => {
        if (expression.kind === "ref") {
          const local = (script.safeConfigBindings ?? []).find(
            (item) => item.name === expression.name,
          );
          if (local) {
            return {
              kind: "literal",
              value: resolveBindingValue(
                script,
                expression.name,
              ),
            };
          }

          const imported = (script.safeConfigImports ?? []).find(
            (item) => item.localName === expression.name,
          );
          if (!imported) {
            throw new Error(
              "Unknown safe config reference " +
                expression.name +
                " in " +
                script.identifier,
            );
          }
          const targetId = importTargetByKey.get(
            script.identifier + "|" + imported.module,
          );
          const target = targetId
            ? scriptsById.get(targetId)
            : undefined;
          if (!target) {
            throw new Error(
              "Safe config import " +
                imported.module +
                " from " +
                script.identifier +
                " is unresolved.",
            );
          }
          const targetLocalName = exportedLocalName(
            target,
            imported.importedName,
          );
          if (!targetLocalName) {
            throw new Error(
              "Safe config export " +
                imported.importedName +
                " is not declared by " +
                target.identifier,
            );
          }

          crossFileResolvedBindings +=
            importedNames.has(expression.name) ? 1 : 0;
          return {
            kind: "literal",
            value: resolveBindingValue(
              target,
              targetLocalName,
            ),
          };
        }

        if (expression.kind === "array") {
          return {
            kind: "array",
            items: expression.items.map(resolveExpression),
          };
        }
        if (expression.kind === "object") {
          return {
            kind: "object",
            entries: Object.fromEntries(
              Object.entries(expression.entries).map(
                ([key, value]) => [
                  key,
                  resolveExpression(value),
                ],
              ),
            ),
          };
        }
        if (expression.kind === "binary") {
          return {
            ...expression,
            left: resolveExpression(expression.left),
            right: resolveExpression(expression.right),
          };
        }
        if (expression.kind === "get") {
          return {
            ...expression,
            object: resolveExpression(expression.object),
          };
        }
        if (expression.kind === "intrinsic") {
          return {
            ...expression,
            args: expression.args.map(resolveExpression),
          };
        }
        return expression;
      };

      const value = evaluateSafeConfig(
        resolveExpression(binding.expression),
      );
      cache.set(cacheKey, value);
      return value;
    } finally {
      resolving.delete(cacheKey);
    }
  };

  for (const script of scripts) {
    for (const binding of script.safeConfigBindings ?? []) {
      try {
        const value = resolveBindingValue(
          script,
          binding.name,
        );
        resolvedBindings.push({
          scriptId: script.identifier,
          name: binding.name,
          value,
          source: binding.source,
        });

        if (
          ARENA_COUNT_NAME.test(binding.name) &&
          typeof value === "number" &&
          Number.isInteger(value) &&
          value > 0
        ) {
          arenaCountCandidates.push({
            scriptId: script.identifier,
            name: binding.name,
            value,
            source: binding.source,
          });
        }

        const points = asVectorSeries(value);
        const layoutMode =
          ARENA_ABSOLUTE_LAYOUT_NAME.test(binding.name)
            ? "absolute-centers" as const
            : ARENA_OFFSET_LAYOUT_NAME.test(binding.name)
              ? "relative-offsets" as const
              : undefined;
        if (points && layoutMode) {
          arenaLayoutCandidates.push({
            scriptId: script.identifier,
            name: binding.name,
            mode: layoutMode,
            points,
            source: binding.source,
          });
        }
      } catch (error) {
        failedBindings.push({
          scriptId: script.identifier,
          name: binding.name,
          reason:
            error instanceof Error
              ? error.message
              : String(error),
          source: binding.source,
        });
      }
    }
  }

  const distinctArenaCounts = [
    ...new Set(
      arenaCountCandidates.map((item) => item.value),
    ),
  ].sort((a, b) => a - b);

  const distinctLayouts = [
    ...new Map(
      arenaLayoutCandidates.map((item) => [
        normalizedLayoutKey(item),
        item,
      ]),
    ).entries(),
  ];
  const arenaLayoutConflict = distinctLayouts.length > 1;
  const representativeLayout =
    distinctLayouts.length === 1
      ? distinctLayouts[0]![1]
      : undefined;
  const layoutArenaCount =
    representativeLayout?.points.length;
  const countFromNames =
    distinctArenaCounts.length === 1
      ? distinctArenaCounts[0]
      : undefined;
  const arenaCountConflict =
    distinctArenaCounts.length > 1 ||
    (
      countFromNames !== undefined &&
      layoutArenaCount !== undefined &&
      countFromNames !== layoutArenaCount
    );
  const resolvedArenaCount =
    arenaCountConflict
      ? undefined
      : countFromNames ?? layoutArenaCount;

  const resolvedArenaLayout =
    representativeLayout === undefined ||
    arenaLayoutConflict
      ? undefined
      : {
          mode: representativeLayout.mode,
          arenaCount: representativeLayout.points.length,
          ...(representativeLayout.mode === "absolute-centers"
            ? {
                canonicalAnchor:
                  representativeLayout.points[0],
              }
            : {}),
          offsets: representativeLayout.points.map((point) => ({
            x: point.x - representativeLayout.points[0]!.x,
            y: point.y - representativeLayout.points[0]!.y,
            z: point.z - representativeLayout.points[0]!.z,
          })),
          sourceNames: arenaLayoutCandidates
            .filter((item) =>
              normalizedLayoutKey(item) ===
              normalizedLayoutKey(representativeLayout)
            )
            .map((item) => item.name)
            .sort(),
        } satisfies ScriptArenaLayout;

  return {
    compiledBindings: scripts.reduce(
      (sum, script) =>
        sum + (script.safeConfigBindings?.length ?? 0),
      0,
    ),
    rejectedBindings: scripts.reduce(
      (sum, script) =>
        sum + (script.safeConfigRejected?.length ?? 0),
      0,
    ),
    crossFileResolvedBindings,
    resolvedBindings: resolvedBindings.sort((a, b) =>
      a.scriptId.localeCompare(b.scriptId) ||
      a.name.localeCompare(b.name)
    ),
    failedBindings: failedBindings.sort((a, b) =>
      a.scriptId.localeCompare(b.scriptId) ||
      a.name.localeCompare(b.name)
    ),
    arenaCountCandidates: arenaCountCandidates.sort((a, b) =>
      a.scriptId.localeCompare(b.scriptId) ||
      a.name.localeCompare(b.name)
    ),
    arenaLayoutCandidates: arenaLayoutCandidates.sort((a, b) =>
      a.scriptId.localeCompare(b.scriptId) ||
      a.name.localeCompare(b.name)
    ),
    ...(resolvedArenaCount === undefined
      ? {}
      : { resolvedArenaCount }),
    ...(resolvedArenaLayout === undefined
      ? {}
      : { resolvedArenaLayout }),
    arenaCountConflict,
    arenaLayoutConflict,
  };
}
