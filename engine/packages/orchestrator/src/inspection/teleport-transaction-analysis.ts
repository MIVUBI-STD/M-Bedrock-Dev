import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";
import type { ScriptSpatialAnalysis } from "./script-spatial-analysis.js";

export function analyzeTeleportTransactions(
  scripts: readonly ParsedScriptFile[],
  spatial: ScriptSpatialAnalysis,
) {
  return spatial.resolvedEffectSources
    .filter((item) => item.effect.kind === "teleport")
    .map((item) => {
      const script = scripts.find((candidate) => candidate.identifier === item.scriptId);
      const binding = item.resultBinding;
      const guarded = binding !== undefined &&
        (script?.guardedOutcomes ?? []).some((outcome) =>
          outcome.executionRegion === item.executionRegion &&
          outcome.conditionIdentifiers.includes(binding)
        );
      const mechanism = binding === undefined ? "teleport" as const : "tryTeleport" as const;
      return {
        sourcePath: item.source.relativePath,
        executionRegion: item.executionRegion,
        mechanism,
        ...(binding === undefined ? {} : { resultBinding: binding }),
        resultGuarded: guarded,
        collisionPolicy: item.checkForBlocks === true
          ? "check-for-blocks" as const
          : item.checkForBlocks === false
            ? "unchecked" as const
            : "unspecified" as const,
        dimensionPolicy: item.dimensionExpression === undefined
          ? "current" as const
          : "explicit" as const,
        status: mechanism === "teleport"
          ? "apply-only" as const
          : guarded
            ? "guarded-apply" as const
            : "unguarded-result" as const,
      };
    });
}
