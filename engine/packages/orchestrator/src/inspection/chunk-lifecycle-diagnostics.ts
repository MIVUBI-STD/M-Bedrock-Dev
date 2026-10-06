import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../../diagnostics/src/index.js";
import type {
  ChunkLifecycleAnalysis,
} from "./chunk-lifecycle-analysis.js";

export function chunkLifecycleDiagnostics(
  analysis: ChunkLifecycleAnalysis,
): DiagnosticFinding[] {
  const worldLoadReconciliationMissing =
    analysis.tickingAreaAcquires > 0 &&
    analysis.worldLoadReconciliationPaths === 0;

  const strongRisk =
    analysis.acquireWithoutRelease > 0 ||
    analysis.releaseUnreachable > 0 ||
    analysis.shutdownOnlyCleanupRisk > 0;
  const reviewRisk =
    analysis.capacityUncheckedLeases > 0 ||
    analysis.cleanupOrderUnproven > 0 ||
    analysis.readinessUnverifiedLeases > 0 ||
    analysis.unguardedDeferredChunkWork > 0 ||
    analysis.zeroTickDeferredChunkWork > 0 ||
    analysis.unboundedDeferredChunkRetries > 0 ||
    analysis.spawnRetryDedupGaps > 0 ||
    analysis.unserializedTickingAreaAllocations > 0 ||
    analysis.broadSpawnRecoveryRisks > 0 ||
    analysis.entityRemoveTerminalizationRisks > 0 ||
    analysis.unresolvedResidencyStateMachines > 0 ||
    (
      analysis.entityResidencyObservability !==
        "absent" &&
      analysis.completeResidencyStateMachines === 0
    ) ||
    worldLoadReconciliationMissing;

  if (!strongRisk && !reviewRisk) {
    return [];
  }

  return [
    createDiagnostic({
      code: "CHUNK_LIFECYCLE_SOURCE_RISK",
      severity: strongRisk
        ? "medium"
        : "minor",
      message:
        "Static chunk lifecycle ownership evidence requires review before runtime readiness or cleanup can be treated as reliable.",
      data: {
        acquireWithoutRelease:
          analysis.acquireWithoutRelease,
        releaseUnreachable:
          analysis.releaseUnreachable,
        cleanupOrderUnproven:
          analysis.cleanupOrderUnproven,
        capacityUncheckedLeases:
          analysis.capacityUncheckedLeases,
        readinessUnverifiedLeases:
          analysis.readinessUnverifiedLeases,
        shutdownOnlyCleanupRisk:
          analysis.shutdownOnlyCleanupRisk,
        unguardedDeferredChunkWork:
          analysis.unguardedDeferredChunkWork,
        zeroTickDeferredChunkWork:
          analysis.zeroTickDeferredChunkWork,
        boundedDeferredChunkRetries:
          analysis.boundedDeferredChunkRetries,
        unboundedDeferredChunkRetries:
          analysis.unboundedDeferredChunkRetries,
        deduplicatedSpawnRetryPaths:
          analysis.deduplicatedSpawnRetryPaths,
        spawnRetryDedupGaps:
          analysis.spawnRetryDedupGaps,
        serializedTickingAreaAllocations:
          analysis.serializedTickingAreaAllocations,
        unserializedTickingAreaAllocations:
          analysis.unserializedTickingAreaAllocations,
        spawnRecoveryRoutes:
          analysis.spawnRecoveryRoutes,
        unloadedSpecificSpawnRecoveryRoutes:
          analysis.unloadedSpecificSpawnRecoveryRoutes,
        broadSpawnRecoveryRisks:
          analysis.broadSpawnRecoveryRisks,
        otherSpecificSpawnRecoveryRoutes:
          analysis.otherSpecificSpawnRecoveryRoutes,
        entityRemoveTerminalizationRisks:
          analysis.entityRemoveTerminalizationRisks,
        entityDieObservers:
          analysis.entityDieObservers,
        entitySpawnObservers:
          analysis.entitySpawnObservers,
        completeResidencyStateMachines:
          analysis.completeResidencyStateMachines,
        unresolvedResidencyStateMachines:
          analysis.unresolvedResidencyStateMachines,
        worldLoadReconciliationMissing,
        dynamicLeaseKeys:
          analysis.dynamicLeaseKeys,
        entityResidencyObservability:
          analysis.entityResidencyObservability,
      },
    }),
  ];
}
