import type { ParsedFunction } from "../../../../analyzers/functions/src/index.js";
import { flattenCommandEffects } from "../../../../analyzers/commands/src/index.js";
import type { CommandEffect } from "../../../../analyzers/commands/src/index.js";
import {
  effectUsesOnlyAbsoluteCoordinates,
  resolveEffect,
  type ResolvedEffect,
} from "../../../../analyzers/topology/src/index.js";
import { deriveTopologyCandidates, discoverArenaReplicasFromTopology, inferArenaRegionPlan, classifyArenaRegionRoles } from "../../../../analyzers/topology/src/index.js";
import { detectLinearTopologyOutliers } from "../../../../analyzers/topology/src/index.js";
import { stateAccessesFromEffects } from "../../../../analyzers/topology/src/index.js";
import { likelyGlobalAccess } from "../../../../analyzers/topology/src/index.js";
import { stateScopeDiagnostics, linearTopologyOutlierDiagnostics } from "../../../../analyzers/diagnostics/src/index.js";
import type { LinearTopologyOutlier } from "../../../../analyzers/topology/src/index.js";

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
  options: {
    arenaRegionContracts?: readonly import("../../../project-model/src/index.js").ArenaRegionContract[];
    additionalResolvedEffects?: readonly ResolvedEffect[];
  } = {},
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

  const commandResolvedSpatialEffects =
    spatialRecords.map((record) => record.resolved);
  const resolvedSpatialEffects = [
    ...commandResolvedSpatialEffects,
    ...(options.additionalResolvedEffects ?? []),
  ];
  const candidates = deriveTopologyCandidates(resolvedSpatialEffects);
  const linearOutliers = detectLinearTopologyOutliers(resolvedSpatialEffects);
  const arenaReplicaDiscovery = discoverArenaReplicasFromTopology(
    resolvedSpatialEffects,
    candidates,
  );
  const arenaRegionPlan =
    arenaReplicaDiscovery === undefined
      ? undefined
      : inferArenaRegionPlan(
          resolvedSpatialEffects,
          candidates,
          arenaReplicaDiscovery,
        );
  const arenaRegionClassification =
    arenaRegionPlan === undefined
      ? undefined
      : classifyArenaRegionRoles(
          arenaRegionPlan,
          resolvedSpatialEffects,
          candidates,
          options.arenaRegionContracts ?? [],
          arenaReplicaDiscovery!.canonical.anchor,
        );
  const topologyDiagnostics = linearTopologyOutlierDiagnostics(linearOutliers);

  const repairableTopologyCandidates: RepairableTopologyCandidate[] =
    linearOutliers.flatMap((outlier) => {
      const record = spatialRecords[outlier.effectIndex];
      if (
        !record ||
        !record.directTopLevel ||
        (
          record.effect.kind !== "fill" &&
          record.effect.kind !== "setblock"
        )
      ) {
        return [];
      }
      return [{ outlier, record }];
    });

  return {
    stateAccesses,
    stateDiagnostics,
    resolvedSpatialEffects,
    commandResolvedSpatialEffects,
    additionalResolvedSpatialEffects:
      options.additionalResolvedEffects ?? [],
    spatialRecords,
    candidates,
    linearOutliers,
    repairableTopologyCandidates,
    arenaReplicaDiscovery,
    arenaRegionPlan,
    arenaRegionClassification,
    topologyDiagnostics,
    broadWrites: stateAccesses.filter(
      (access) => access.access === "write" && likelyGlobalAccess(access),
    ).length,
  };
}
