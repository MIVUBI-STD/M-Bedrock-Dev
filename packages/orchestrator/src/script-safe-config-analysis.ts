import type { ParsedScriptFile } from "../../../analyzers/scripts/src/index.js";
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

  for (const script of scripts) {
    const compiled = script.safeConfigBindings ?? [];
    const environment = {
      bindings: Object.fromEntries(
        compiled.map((item) => [
          item.name,
          item.expression,
        ]),
      ) as Readonly<Record<string, SafeConfigExpression>>,
    };

    for (const binding of compiled) {
      try {
        const value = evaluateSafeConfig(
          { kind: "ref", name: binding.name },
          environment,
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
