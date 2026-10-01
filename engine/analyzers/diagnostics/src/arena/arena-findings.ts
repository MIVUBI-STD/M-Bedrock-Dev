import type { ArenaReplicaComparison } from "../../../topology/src/index.js";
import type { SpatialFingerprintComparison } from "../../../world-db/src/index.js";
import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../../../packages/diagnostics/src/index.js";
import type { SourceRef } from "../../../../packages/project-model/src/index.js";

export function arenaReplicaDiagnostics(
  comparison: ArenaReplicaComparison,
  source?: SourceRef,
): DiagnosticFinding[] {
  if (comparison.ok) return [];
  return [
    createDiagnostic({
      code: "ARENA_REPLICA_DIVERGENCE",
      severity: "critical",
      message:
        `Arena ${comparison.targetArenaId} diverges from canonical arena ${comparison.referenceArenaId}.`,
      ...(source === undefined ? {} : { source }),
      data: {
        referenceArenaId: comparison.referenceArenaId,
        targetArenaId: comparison.targetArenaId,
        translation: comparison.translation,
        mismatchCount: comparison.mismatches.length,
        mismatchKinds: [...new Set(comparison.mismatches.map((item) => item.kind))].sort(),
      },
    }),
  ];
}

export function arenaSpatialFingerprintDiagnostics(
  comparison: SpatialFingerprintComparison,
  source?: SourceRef,
): DiagnosticFinding[] {
  if (comparison.equal) return [];
  return [
    createDiagnostic({
      code: "ARENA_SPATIAL_FINGERPRINT_DIVERGENCE",
      severity: "critical",
      message: "Arena physical world fingerprint differs from its canonical replica.",
      ...(source === undefined ? {} : { source }),
      data: {
        referenceHash: comparison.referenceHash,
        targetHash: comparison.targetHash,
        differingBuckets: comparison.differingBuckets,
      },
    }),
  ];
}
