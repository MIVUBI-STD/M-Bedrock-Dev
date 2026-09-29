import type {
  ParsedScriptFile,
  ScriptSpatialMutationEvidence,
} from "../../../analyzers/scripts/src/index.js";
import type {
  ResolvedEffect,
} from "../../../analyzers/topology/src/index.js";
import {
  evaluateSafeConfig,
  type SafeConfigExpression,
  type SafeConfigValue,
} from "../../behavior-model/src/index.js";

export interface ResolvedScriptStructurePlacement {
  scriptId: string;
  identifier?: string;
  position: { x: number; y: number; z: number };
  executionRegion: string;
  sourcePath: string;
}

export interface ScriptSpatialResolutionFailure {
  scriptId: string;
  kind: ScriptSpatialMutationEvidence["kind"];
  executionRegion: string;
  reason: string;
  sourcePath: string;
}

export interface ScriptSpatialAnalysis {
  resolvedEffects: readonly ResolvedEffect[];
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

  if (mutation.kind === "fill") {
    const from = evaluateVector(mutation.from, bindings);
    const to = evaluateVector(mutation.to, bindings);
    if (!from || !to) {
      return {
        failure: {
          scriptId: script.identifier,
          kind: mutation.kind,
          executionRegion: mutation.executionRegion,
          reason:
            "fillBlocks coordinates could not be resolved by deterministic safe config.",
          sourcePath,
        },
      };
    }
    if (
      mutation.blockHint === undefined ||
      mutation.blockHint === "script:unknown-block"
    ) {
      return {
        failure: {
          scriptId: script.identifier,
          kind: mutation.kind,
          executionRegion: mutation.executionRegion,
          reason:
            "fillBlocks block identity is runtime-dynamic, so topology equivalence is not proven.",
          sourcePath,
        },
      };
    }
    return {
      effect: {
        kind: "fill",
        from,
        to,
        block: mutation.blockHint,
        sourcePath,
      },
    };
  }

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

  if (mutation.kind === "setblock") {
    if (
      mutation.blockHint === undefined ||
      mutation.blockHint === "script:unknown-block"
    ) {
      return {
        failure: {
          scriptId: script.identifier,
          kind: mutation.kind,
          executionRegion: mutation.executionRegion,
          reason:
            "Block identity is runtime-dynamic, so topology equivalence is not proven.",
          sourcePath,
        },
      };
    }
    return {
      effect: {
        kind: "setblock",
        position,
        block: mutation.blockHint,
        sourcePath,
      },
    };
  }

  if (mutation.kind === "teleport") {
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
    if (
      mutation.identifier === undefined ||
      mutation.identifier === "script:unknown-entity"
    ) {
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
    },
  };
}

export function analyzeScriptSpatialMutations(
  scripts: readonly ParsedScriptFile[],
): ScriptSpatialAnalysis {
  const resolvedEffects: ResolvedEffect[] = [];
  const structurePlacements: ResolvedScriptStructurePlacement[] = [];
  const failures: ScriptSpatialResolutionFailure[] = [];

  for (const script of scripts) {
    const bindings = Object.fromEntries(
      (script.safeConfigBindings ?? []).map((item) => [
        item.name,
        item.expression,
      ]),
    ) as Readonly<Record<string, SafeConfigExpression>>;

    for (const mutation of script.spatialMutations ?? []) {
      const resolved = resolveMutation(
        script,
        mutation,
        bindings,
      );
      if ("effect" in resolved) {
        resolvedEffects.push(resolved.effect);
      } else if ("placement" in resolved) {
        structurePlacements.push(resolved.placement);
      } else {
        failures.push(resolved.failure);
      }
    }
  }

  return {
    resolvedEffects,
    structurePlacements,
    failures,
    extractedMutations: scripts.reduce(
      (sum, script) =>
        sum + (script.spatialMutations?.length ?? 0),
      0,
    ),
    rejectedMutations: scripts.reduce(
      (sum, script) =>
        sum + (script.spatialMutationRejected?.length ?? 0),
      0,
    ),
  };
}
