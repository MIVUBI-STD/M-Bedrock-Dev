import type {
  BlindspotCoverage,
  MapCompatibilityFingerprint,
  MinecraftUpdateDelta,
  RegressionCase,
  ReliabilityDomain,
  ReliabilityLane,
  RetestPlan,
  RetestPriority,
  RetestReason,
} from "./types.js";

function priorityFor(weight: number): RetestPriority {
  if (weight >= 10) return "P0";
  if (weight >= 6) return "P1";
  if (weight >= 3) return "P2";
  return "P3";
}

function laneSet(
  reasons: readonly RetestReason[],
  domains: readonly ReliabilityDomain[],
): ReliabilityLane[] {
  const lanes = new Set<ReliabilityLane>(["static"]);

  if (reasons.some((reason) => reason.kind === "update-overlap")) lanes.add("differential");
  if (reasons.some((reason) => reason.kind === "historical-regression")) lanes.add("runtime");
  if (domains.some((domain) => ["multiplayer", "chunks", "entities"].includes(domain))) {
    lanes.add("runtime");
    lanes.add("generative");
  }

  return [...lanes];
}

export function planRetest(
  fingerprint: MapCompatibilityFingerprint,
  delta: MinecraftUpdateDelta,
  regressions: readonly RegressionCase[] = [],
  coverage: readonly BlindspotCoverage[] = [],
): RetestPlan {
  const reasons: RetestReason[] = [];
  const mapCapabilities = new Set(fingerprint.capabilityTags);
  const mapDomains = new Set(fingerprint.domains);
  const affectedDomains = new Set<ReliabilityDomain>();

  for (const entry of delta.entries) {
    const capabilityOverlap = entry.capabilityTags.filter((tag) => mapCapabilities.has(tag));
    const domainOverlap = mapDomains.has(entry.domain);

    if (capabilityOverlap.length === 0 && !domainOverlap) continue;

    affectedDomains.add(entry.domain);
    const weight =
      entry.kind === "removed" || entry.kind === "behavior-changed" ? 5 :
      entry.kind === "validation-tightened" || entry.kind === "changed" ? 4 :
      2;

    reasons.push({
      kind: "update-overlap",
      detail: `${entry.id}: ${entry.summary}`,
      weight,
    });
  }

  for (const regression of regressions) {
    const capabilityMatch = regression.capabilityTags.some((tag) => mapCapabilities.has(tag));
    const domainMatch = mapDomains.has(regression.domain);
    if (!capabilityMatch && !domainMatch) continue;

    affectedDomains.add(regression.domain);
    reasons.push({
      kind: "historical-regression",
      detail: `Historical regression ${regression.id}: ${regression.title}`,
      weight: 4,
    });
  }

  for (const item of coverage) {
    if (!mapDomains.has(item.domain)) continue;
    if (item.state !== "unknown" && item.state !== "partial") continue;

    affectedDomains.add(item.domain);
    reasons.push({
      kind: "coverage-gap",
      detail: `${item.domain}/${item.lane} coverage is ${item.state}`,
      weight: item.state === "unknown" ? 2 : 1,
    });
  }

  for (const surface of fingerprint.riskSurfaces) {
    if (!["entity-ai", "chunk-lifecycle", "multiplayer-concurrency", "script-beta"].includes(surface)) {
      continue;
    }
    reasons.push({
      kind: "runtime-sensitive",
      detail: `Runtime-sensitive surface: ${surface}`,
      weight: 2,
    });
  }

  const totalWeight = reasons.reduce((sum, reason) => sum + reason.weight, 0);
  const domains = [...affectedDomains].sort();

  return {
    mapId: fingerprint.mapId,
    updateVersion: delta.toVersion,
    priority: priorityFor(totalWeight),
    reasons: reasons.sort((a, b) => b.weight - a.weight || a.detail.localeCompare(b.detail)),
    suggestedLanes: laneSet(reasons, domains),
    affectedDomains: domains,
  };
}
