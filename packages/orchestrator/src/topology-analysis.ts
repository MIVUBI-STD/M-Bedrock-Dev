import type { ParsedFunction } from "../../../analyzers/functions/src/types.js";
import { flattenCommandEffects } from "../../../analyzers/commands/src/flatten.js";
import type { CommandEffect } from "../../../analyzers/commands/src/effects.js";
import {
  effectUsesOnlyAbsoluteCoordinates,
  resolveEffect,
  type ResolvedEffect,
} from "../../../analyzers/topology/src/effect-resolution.js";
import { deriveTopologyCandidates } from "../../../analyzers/topology/src/candidates.js";
import { detectLinearTopologyOutliers } from "../../../analyzers/topology/src/linear-outliers.js";
import { stateAccessesFromEffects } from "../../../analyzers/topology/src/state-from-effects.js";
import { likelyGlobalAccess } from "../../../analyzers/topology/src/state-scope.js";
import { stateScopeDiagnostics, linearTopologyOutlierDiagnostics } from "../../../analyzers/diagnostics/src/topology-findings.js";
import type { LinearTopologyOutlier } from "../../../analyzers/topology/src/linear-outliers.js";

export interface SpatialEffectRecord {
  effect: CommandEffect;
  resolved: ResolvedEffect;
  rawCommand: string;
  directTopLevel: boolean;
}

export interface RepairableTopologyCandidate {
  outlier: LinearTopologyOutlier;
  record: SpatialEffectRecord;
}

export function analyzeFunctionTopology(
  functions: readonly ParsedFunction[],
) {
  const effects: CommandEffect[] = [];
  const spatialRecords: SpatialEffectRecord[] = [];

  const absoluteContext = {
    origin: { x: 0, y: 0, z: 0 },
  };

  for (const fn of functions) {
    for (const command of fn.commands) {
      const flattened = flattenCommandEffects(command.analysis);
      effects.push(...flattened);
      const directEffects = new Set(command.analysis.effects);

      for (const effect of flattened) {
        if (!effectUsesOnlyAbsoluteCoordinates(effect)) continue;
        const resolved = resolveEffect(effect, absoluteContext);
        if (!resolved) continue;
        spatialRecords.push({
          effect,
          resolved,
          rawCommand: command.raw,
          directTopLevel: directEffects.has(effect),
        });
      }
    }
  }

  const stateAccesses = stateAccessesFromEffects(effects);
  const stateDiagnostics = stateScopeDiagnostics(stateAccesses);

  const resolvedSpatialEffects = spatialRecords.map((record) => record.resolved);
  const candidates = deriveTopologyCandidates(resolvedSpatialEffects);
  const linearOutliers = detectLinearTopologyOutliers(resolvedSpatialEffects);
  const topologyDiagnostics = linearTopologyOutlierDiagnostics(linearOutliers);

  const repairableTopologyCandidates: RepairableTopologyCandidate[] = linearOutliers
    .map((outlier) => ({
      outlier,
      record: spatialRecords[outlier.effectIndex]!,
    }))
    .filter(({ record }) =>
      record.directTopLevel &&
      (record.effect.kind === "fill" || record.effect.kind === "setblock")
    );

  return {
    stateAccesses,
    stateDiagnostics,
    resolvedSpatialEffects,
    spatialRecords,
    candidates,
    linearOutliers,
    repairableTopologyCandidates,
    topologyDiagnostics,
    broadWrites: stateAccesses.filter(
      (access) => access.access === "write" && likelyGlobalAccess(access),
    ).length,
  };
}
