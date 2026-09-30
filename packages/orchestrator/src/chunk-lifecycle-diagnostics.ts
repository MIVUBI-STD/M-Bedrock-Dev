import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../diagnostics/src/index.js";
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
    analysis.shutdownOnlyCleanupRisk > 0;
  const reviewRisk =
    analysis.capacityUncheckedLeases > 0 ||
    analysis.unguardedDeferredChunkWork > 0 ||
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
        capacityUncheckedLeases:
          analysis.capacityUncheckedLeases,
        shutdownOnlyCleanupRisk:
          analysis.shutdownOnlyCleanupRisk,
        unguardedDeferredChunkWork:
          analysis.unguardedDeferredChunkWork,
        worldLoadReconciliationMissing,
        dynamicLeaseKeys:
          analysis.dynamicLeaseKeys,
        entityResidencyObservability:
          analysis.entityResidencyObservability,
      },
    }),
  ];
}
