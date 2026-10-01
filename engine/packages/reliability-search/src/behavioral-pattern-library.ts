export type BehavioralPatternEvidenceStatus =
  | "observed"
  | "challenged"
  | "rejected";

export interface BehavioralPatternEvidence {
  mapId: string;
  patternId: string;
  implementationVariant?: string;
  failureSignatures?: readonly string[];
  evidenceIds: readonly string[];
  status: BehavioralPatternEvidenceStatus;
}

export interface BehavioralPatternSummary {
  patternId: string;
  supportingMaps: readonly string[];
  challengedMaps: readonly string[];
  rejectedMaps: readonly string[];
  implementationVariants: readonly {
    id: string;
    maps: readonly string[];
  }[];
  failureSignatures: readonly {
    id: string;
    maps: readonly string[];
  }[];
  distinctMaps: number;
  state: "candidate" | "reusable-pattern";
}

export interface BehavioralPatternLibrary {
  schemaVersion: 1;
  minimumDistinctMaps: number;
  patterns: readonly BehavioralPatternSummary[];
}

export function buildBehavioralPatternLibrary(
  evidence: readonly BehavioralPatternEvidence[],
  minimumDistinctMaps = 2,
): BehavioralPatternLibrary {
  if (!Number.isInteger(minimumDistinctMaps) || minimumDistinctMaps < 2) {
    throw new Error("minimumDistinctMaps must be an integer >= 2.");
  }

  const byPattern = new Map<string, BehavioralPatternEvidence[]>();
  for (const item of evidence) {
    if (!item.mapId.trim() || !item.patternId.trim()) continue;
    const list = byPattern.get(item.patternId) ?? [];
    list.push(item);
    byPattern.set(item.patternId, list);
  }

  const patterns = [...byPattern.entries()].map(([patternId, items]) => {
    const mapsFor = (status: BehavioralPatternEvidenceStatus) =>
      [...new Set(items.filter((x) => x.status === status).map((x) => x.mapId))].sort();

    const variantBuckets = new Map<string, Set<string>>();
    const failureBuckets = new Map<string, Set<string>>();
    for (const item of items) {
      if (item.implementationVariant) {
        const bucket = variantBuckets.get(item.implementationVariant) ?? new Set<string>();
        bucket.add(item.mapId);
        variantBuckets.set(item.implementationVariant, bucket);
      }
      for (const signature of item.failureSignatures ?? []) {
        const bucket = failureBuckets.get(signature) ?? new Set<string>();
        bucket.add(item.mapId);
        failureBuckets.set(signature, bucket);
      }
    }

    const allMaps = [...new Set(items.map((x) => x.mapId))].sort();
    const supportingMaps = mapsFor("observed");
    const challengedMaps = mapsFor("challenged");
    const rejectedMaps = mapsFor("rejected");
    const reusable =
      supportingMaps.length >= minimumDistinctMaps &&
      rejectedMaps.length === 0;

    return {
      patternId,
      supportingMaps,
      challengedMaps,
      rejectedMaps,
      implementationVariants: [...variantBuckets.entries()]
        .map(([id, maps]) => ({ id, maps: [...maps].sort() }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      failureSignatures: [...failureBuckets.entries()]
        .map(([id, maps]) => ({ id, maps: [...maps].sort() }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      distinctMaps: allMaps.length,
      state: reusable ? "reusable-pattern" as const : "candidate" as const,
    };
  }).sort((a, b) =>
    b.supportingMaps.length - a.supportingMaps.length ||
    a.patternId.localeCompare(b.patternId),
  );

  return { schemaVersion: 1, minimumDistinctMaps, patterns };
}
