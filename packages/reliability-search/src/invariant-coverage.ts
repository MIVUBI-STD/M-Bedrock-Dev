import type { RuntimeObservationSnapshot } from "../../reliability/src/index.js";
import type { SemanticCoverageSignature } from "./types.js";

export interface SnapshotCoverageEvidence {
  snapshot: RuntimeObservationSnapshot;
  coverage?: SemanticCoverageSignature;
  mapId?: string;
}

export function coverageBucketKey(item: SnapshotCoverageEvidence): string {
  const features = (item.coverage?.features ?? [])
    .map((feature) => `${feature.dimension}:${feature.key}`)
    .sort();

  if (features.length === 0) {
    return JSON.stringify({
      mapId: item.mapId ?? null,
      coverage: "unknown",
    });
  }

  return JSON.stringify({
    mapId: item.mapId ?? null,
    features,
  });
}

export function distinctCoverageBuckets(
  evidence: readonly SnapshotCoverageEvidence[],
): number {
  return new Set(evidence.map(coverageBucketKey)).size;
}
