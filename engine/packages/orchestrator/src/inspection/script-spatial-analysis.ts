import type {
  ParsedScriptFile,
  ScriptSpatialMutationEvidence,
} from "../../../../analyzers/scripts/src/index.js";
import type {
  ResolvedEffect,
} from "../../../../analyzers/topology/src/index.js";
import {
  evaluateSafeConfig,
  type SafeConfigExpression,
  type SafeConfigValue,
} from "../../../behavior-model/src/index.js";
import type {
  SourceRef,
} from "../../../project-model/src/index.js";

export interface ResolvedScriptStructurePlacement {
  scriptId: string;
  identifier?: string;
  position: { x: number; y: number; z: number };
  executionRegion: string;
  sourcePath: string;
  source: SourceRef;
}

export interface ResolvedScriptSpatialEffect {
  scriptId: string;
  effect: ResolvedEffect;
  executionRegion: string;
  source: SourceRef;
}

export interface ScriptSpatialResolutionFailure {
  scriptId: string;
  kind: ScriptSpatialMutationEvidence["kind"] | "setblock" | "fill";
  executionRegion: string;
  reason: string;
  sourcePath: string;
}

export interface ScriptSpatialAnalysis {
  resolvedEffects: readonly ResolvedEffect[];
  resolvedEffectSources: readonly ResolvedScriptSpatialEffect[];
  structurePlacements: readonly ResolvedScriptStructurePlacement[];
  failures: readonly ScriptSpatialResolutionFailure[];
  extractedMutations: number;
  rejectedMutations: number;
}

function vector3(
  value: SafeConfigValue,
): { x: number; y: number; z: number } | undefined {
  if (
    value === null ||
    Array.isArray(value) ||
    typeof value !== "object"
  ) {
    return undefined;
  }
  const object = value as Readonly<Record<string, SafeConfigValue>>;
  if (
    typeof object.x !== "number" ||
    !Number.isFinite(object.x) ||
    typeof object.y !== "number" ||
    !Number.isFinite(object.y) ||
    typeof object.z !== "number" ||
    !Number.isFinite(object.z)
  ) {
    return undefined;
  }
  return {
    x: object.x,
    y: object.y,
    z: object.z,
  };
}

function evaluateVector(
  expression: SafeConfigExpression | undefined,
  bindings: Readonly<Record<string, SafeConfigExpression>>,
): { x: number; y: number; z: number } | undefined {
  if (!expression) return undefined;
  try {
    return vector3(
      evaluateSafeConfig(expression, { bindings }),
    );
  } catch {
    return undefined;
  }
}

function resolveMutation(
  script: ParsedScriptFile,
  mutation: ScriptSpatialMutationEvidence,
  bindings: Readonly<Record<string, SafeConfigExpression>>,
):
  | { effect: ResolvedEffect }
  | { placement: ResolvedScriptStructurePlacement }
  | { failure: ScriptSpatialResolutionFailure } {
  const sourcePath = mutation.source.relativePath;
  const position = evaluateVector(
    mutation.position,
    bindings,
  );
  if (!position) {
    return {
      failure: {
        scriptId: script.identifier,
        kind: mutation.kind,
        executionRegion: mutation.executionRegion,
        reason:
          "Spatial coordinate could not be resolved by deterministic safe config.",
        sourcePath,
      },
    };
  }

  if (mutation.kind === "teleport" || mutation.kind === "try-teleport") {
    return {
      effect: {
        kind: "teleport",
        target: mutation.receiverText,
        destination: position,
        sourcePath,
      },
    };
  }

  if (mutation.kind === "entity-spawn") {
    if (mutation.identifier === undefined) {
      return {
        failure: {
          scriptId: script.identifier,
          kind: mutation.kind,
          executionRegion: mutation.executionRegion,
          reason:
            "Entity identifier is runtime-dynamic, so replica equivalence is not proven.",
          sourcePath,
        },
      };
    }
    return {
      effect: {
        kind: "entity-spawn",
        entityIdentifier: mutation.identifier,
        position,
        sourcePath,
      },
    };
  }

  return {
    placement: {
      scriptId: script.identifier,
      ...(mutation.identifier === undefined
        ? {}
        : { identifier: mutation.identifier }),
      position,
      executionRegion: mutation.executionRegion,
      sourcePath,
      source: mutation.source,
    },
  };
}

function resolveWorldMutation(
  script: ParsedScriptFile,
  mutation: NonNullable<ParsedScriptFile["spatialWorldMutations"]>[number],
):
  | { effect: ResolvedEffect }
  | { failure: ScriptSpatialResolutionFailure } {
  const sourcePath = mutation.source.relativePath;
  const kind =
    mutation.method === "fillBlocks"
      ? "fill" as const
      : "setblock" as const;

  if (
    mutation.status !== "resolved" ||
    mutation.volume === undefined
  ) {
    return {
      failure: {
        scriptId: script.identifier,
        kind,
        executionRegion: mutation.executionRegion,
        reason:
          mutation.reason ??
          "Script block mutation could not be resolved statically.",
        sourcePath,
      },
    };
  }

  if (!mutation.writeIdentity) {
    return {
      failure: {
        scriptId: script.identifier,
        kind,
        executionRegion: mutation.executionRegion,
        reason:
          "Block identity is runtime-dynamic, so topology equivalence is not proven.",
        sourcePath,
      },
    };
  }

  if (mutation.method === "fillBlocks") {
    return {
      effect: {
        kind: "fill",
        from: mutation.volume.min,
        to: mutation.volume.max,
        block: mutation.writeIdentity,
        sourcePath,
      },
    };
  }

  return {
    effect: {
      kind: "setblock",
      position: mutation.volume.min,
      block: mutation.writeIdentity,
      sourcePath,
    },
  };
}

export function analyzeScriptSpatialMutations(
  scripts: readonly ParsedScriptFile[],
): ScriptSpatialAnalysis {
  const resolvedEffects: ResolvedEffect[] = [];
  const resolvedEffectSources: ResolvedScriptSpatialEffect[] = [];
  const structurePlacements: ResolvedScriptStructurePlacement[] = [];
  const failures: ScriptSpatialResolutionFailure[] = [];

  for (const script of scripts) {
    const bindings = Object.fromEntries(
      (script.safeConfigBindings ?? []).map((item) => [
        item.name,
        item.expression,
      ]),
    ) as Readonly<Record<string, SafeConfigExpression>>;

    for (const mutation of script.spatialWorldMutations ?? []) {
      const resolved = resolveWorldMutation(
        script,
        mutation,
      );
      if ("effect" in resolved) {
        resolvedEffects.push(resolved.effect);
        resolvedEffectSources.push({
          scriptId: script.identifier,
          effect: resolved.effect,
          executionRegion:
            mutation.executionRegion,
          source: mutation.source,
          ...(mutation.kind !== "teleport" ||
          mutation.dimensionExpression === undefined
            ? {}
            : { dimensionExpression: mutation.dimensionExpression }),
          ...(mutation.kind !== "teleport" ||
          mutation.checkForBlocks === undefined
            ? {}
            : { checkForBlocks: mutation.checkForBlocks }),\n          ...(mutation.resultBinding === undefined ? {} : { resultBinding: mutation.resultBinding }),
        });
      } else {
        failures.push(resolved.failure);
      }
    }

    for (const mutation of script.spatialMutations ?? []) {
      const resolved = resolveMutation(
        script,
        mutation,
        bindings,
      );
      if ("effect" in resolved) {
        resolvedEffects.push(resolved.effect);
        resolvedEffectSources.push({
          scriptId: script.identifier,
          effect: resolved.effect,
          executionRegion:
            mutation.executionRegion,
          source: mutation.source,
        });
      } else if ("placement" in resolved) {
        structurePlacements.push(resolved.placement);
      } else {
        failures.push(resolved.failure);
      }
    }
  }

  return {
    resolvedEffects,
    resolvedEffectSources,
    structurePlacements,
    failures,
    extractedMutations: scripts.reduce(
      (sum, script) =>
        sum +
        (script.spatialWorldMutations?.length ?? 0) +
        (script.spatialMutations?.length ?? 0),
      0,
    ),
    rejectedMutations: scripts.reduce(
      (sum, script) =>
        sum + (script.spatialMutationRejected?.length ?? 0),
      0,
    ),
  };
}
