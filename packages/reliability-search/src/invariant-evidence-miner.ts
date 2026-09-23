import type { RuntimeObservationSnapshot } from "../../reliability/src/index.js";
import { mineRuntimeInvariants } from "./invariant-miner.js";
import { distinctCoverageBuckets, type SnapshotCoverageEvidence } from "./invariant-coverage.js";
import type {
  InvariantMiningOptions,
  InvariantMiningResult,
} from "./invariant-mining-types.js";

export function mineInvariantEvidence(
  evidence: readonly SnapshotCoverageEvidence[],
  options?: InvariantMiningOptions,
): InvariantMiningResult {
  const snapshots: RuntimeObservationSnapshot[] = evidence.map((item) => item.snapshot);
  const mined = mineRuntimeInvariants(snapshots, options);
  const mapIds = [...new Set(
    evidence.map((item) => item.mapId).filter((value): value is string => Boolean(value)),
  )].sort();
  const coverageBuckets = distinctCoverageBuckets(evidence);
  const minBuckets = options?.minDistinctCoverageBuckets ?? 3;
  const minMaps = options?.minDistinctMaps ?? 1;

  const revise = (candidate: InvariantMiningResult["candidates"][number]) => ({
    ...candidate,
    mapIds,
    support: {
      ...candidate.support,
      distinctCoverageBuckets: coverageBuckets,
      distinctMaps: mapIds.length,
    },
    status:
      candidate.status === "supported" &&
      (coverageBuckets < minBuckets || mapIds.length < minMaps)
        ? "candidate" as const
        : candidate.status,
  });

  return {
    ...mined,
    distinctCoverageBuckets: coverageBuckets,
    distinctMaps: mapIds.length,
    candidates: mined.candidates.map(revise),
    rejected: mined.rejected.map(revise),
  };
}
