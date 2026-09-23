import type { MinedInvariantCandidate } from "./invariant-mining-types.js";

export interface MapInvariantEvidence {
  mapId: string;
  candidates: readonly MinedInvariantCandidate[];
}

export interface CrossMapInvariantSummary {
  candidateKey: string;
  kind: MinedInvariantCandidate["kind"];
  parameters?: MinedInvariantCandidate["parameters"];
  supportingMaps: string[];
  challengedMaps: string[];
  rejectedMaps: string[];
  candidateMaps: string[];
  totalMaps: number;
}

function key(candidate: MinedInvariantCandidate): string {
  return JSON.stringify({ kind: candidate.kind, parameters: candidate.parameters ?? {} });
}

export function summarizeCrossMapInvariantEvidence(
  maps: readonly MapInvariantEvidence[],
): CrossMapInvariantSummary[] {
  const buckets = new Map<string, {
    exemplar: MinedInvariantCandidate;
    supporting: Set<string>;
    challenged: Set<string>;
    rejected: Set<string>;
    candidate: Set<string>;
  }>();

  for (const map of maps) {
    for (const candidate of map.candidates) {
      const candidateKey = key(candidate);
      const bucket = buckets.get(candidateKey) ?? {
        exemplar: candidate,
        supporting: new Set<string>(),
        challenged: new Set<string>(),
        rejected: new Set<string>(),
        candidate: new Set<string>(),
      };

      if (candidate.status === "supported") bucket.supporting.add(map.mapId);
      else if (candidate.status === "challenged" || candidate.status === "stale") bucket.challenged.add(map.mapId);
      else if (candidate.status === "rejected") bucket.rejected.add(map.mapId);
      else bucket.candidate.add(map.mapId);

      buckets.set(candidateKey, bucket);
    }
  }

  return [...buckets.entries()].map(([candidateKey, bucket]) => ({
    candidateKey,
    kind: bucket.exemplar.kind,
    ...(bucket.exemplar.parameters ? { parameters: bucket.exemplar.parameters } : {}),
    supportingMaps: [...bucket.supporting].sort(),
    challengedMaps: [...bucket.challenged].sort(),
    rejectedMaps: [...bucket.rejected].sort(),
    candidateMaps: [...bucket.candidate].sort(),
    totalMaps: new Set([
      ...bucket.supporting,
      ...bucket.challenged,
      ...bucket.rejected,
      ...bucket.candidate,
    ]).size,
  })).sort((a, b) =>
    b.supportingMaps.length - a.supportingMaps.length ||
    b.totalMaps - a.totalMaps ||
    a.candidateKey.localeCompare(b.candidateKey),
  );
}
