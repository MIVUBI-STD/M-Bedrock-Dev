import type {
  BlindspotCoverage,
  ReliabilityDomain,
  ReliabilityLane,
} from "./types.js";

export function coverageKey(
  domain: ReliabilityDomain,
  lane: ReliabilityLane,
): string {
  return `${domain}:${lane}`;
}

export function mergeCoverage(
  entries: readonly BlindspotCoverage[],
): BlindspotCoverage[] {
  const byKey = new Map<string, BlindspotCoverage>();

  for (const entry of entries) {
    const key = coverageKey(entry.domain, entry.lane);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, entry);
      continue;
    }

    const rank = {
      "unknown": 0,
      "partial": 1,
      "covered": 2,
      "not-applicable": 3,
    } as const;

    if (rank[entry.state] > rank[existing.state]) {
      byKey.set(key, entry);
    }
  }

  return [...byKey.values()].sort((a, b) =>
    coverageKey(a.domain, a.lane).localeCompare(coverageKey(b.domain, b.lane)),
  );
}
