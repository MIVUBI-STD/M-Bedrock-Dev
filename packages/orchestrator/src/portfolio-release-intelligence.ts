import type {
  PortfolioMapReleaseStatus,
} from "./portfolio-release-gate.js";
import type {
  PortfolioReleaseManifest,
  PortfolioReleaseManifestMap,
} from "./portfolio-release-report.js";

export interface PortfolioReleaseHistoryEntry {
  releaseId: string;
  manifest: PortfolioReleaseManifest;
}

export interface PortfolioReleaseMapTrend {
  mapId: string;
  releasesSeen: number;
  cleared: number;
  regressed: number;
  blocked: number;
  manualRequired: number;
  missing: number;
  worsenedTransitions: number;
  improvedTransitions: number;
  latestStatus: PortfolioMapReleaseStatus;
}

export interface PortfolioReleaseRegressionTrend {
  key: string;
  mapId: string;
  kind: "regressed" | "blocked" | "manual-required";
  regressionId: string;
  occurrences: number;
  releaseIds: readonly string[];
}

export interface PortfolioReleaseIntelligence {
  releases: number;
  blockedReleases: number;
  releaseEligibleReleases: number;
  maps: readonly PortfolioReleaseMapTrend[];
  recurringRegressions:
    readonly PortfolioReleaseRegressionTrend[];
  currentBlockers:
    readonly PortfolioReleaseRegressionTrend[];
}

const STATUS_RANK: Readonly<Record<
  PortfolioMapReleaseStatus,
  number
>> = {
  cleared: 0,
  "manual-required": 1,
  blocked: 2,
  missing: 3,
  regressed: 4,
};

function regressionItems(
  map: PortfolioReleaseManifestMap,
): {
  kind: PortfolioReleaseRegressionTrend["kind"];
  regressionId: string;
}[] {
  return [
    ...map.regressed.map((item) => ({
      kind: "regressed" as const,
      regressionId: item.regressionId,
    })),
    ...map.blocked.map((item) => ({
      kind: "blocked" as const,
      regressionId: item.regressionId,
    })),
    ...map.manualRequired.map((item) => ({
      kind: "manual-required" as const,
      regressionId: item.regressionId,
    })),
  ];
}

function ensureUniqueReleaseIds(
  entries: readonly PortfolioReleaseHistoryEntry[],
): void {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.releaseId)) {
      throw new Error(
        "Duplicate portfolio release history id: " +
          entry.releaseId +
          ".",
      );
    }
    ids.add(entry.releaseId);
  }
}

export function analyzePortfolioReleaseHistory(
  entries: readonly PortfolioReleaseHistoryEntry[],
): PortfolioReleaseIntelligence {
  ensureUniqueReleaseIds(entries);

  const mapHistory = new Map<
    string,
    {
      statuses: PortfolioMapReleaseStatus[];
      counts: Record<PortfolioMapReleaseStatus, number>;
    }
  >();

  const regressionHistory = new Map<
    string,
    {
      mapId: string;
      kind: PortfolioReleaseRegressionTrend["kind"];
      regressionId: string;
      releaseIds: string[];
    }
  >();

  for (const entry of entries) {
    for (const map of entry.manifest.maps) {
      const current = mapHistory.get(map.mapId) ?? {
        statuses: [],
        counts: {
          cleared: 0,
          regressed: 0,
          blocked: 0,
          "manual-required": 0,
          missing: 0,
        },
      };
      current.statuses.push(map.status);
      current.counts[map.status] += 1;
      mapHistory.set(map.mapId, current);

      for (const regression of regressionItems(map)) {
        const key = [
          map.mapId,
          regression.kind,
          regression.regressionId,
        ].join("::");
        const tracked = regressionHistory.get(key) ?? {
          mapId: map.mapId,
          kind: regression.kind,
          regressionId: regression.regressionId,
          releaseIds: [],
        };
        tracked.releaseIds.push(entry.releaseId);
        regressionHistory.set(key, tracked);
      }
    }
  }

  const maps: PortfolioReleaseMapTrend[] = [
    ...mapHistory.entries(),
  ].map(([mapId, history]) => {
    let worsenedTransitions = 0;
    let improvedTransitions = 0;

    for (let index = 1; index < history.statuses.length; index += 1) {
      const before = history.statuses[index - 1]!;
      const after = history.statuses[index]!;
      const delta =
        STATUS_RANK[after] - STATUS_RANK[before];

      if (delta > 0) worsenedTransitions += 1;
      if (delta < 0) improvedTransitions += 1;
    }

    return {
      mapId,
      releasesSeen: history.statuses.length,
      cleared: history.counts.cleared,
      regressed: history.counts.regressed,
      blocked: history.counts.blocked,
      manualRequired:
        history.counts["manual-required"],
      missing: history.counts.missing,
      worsenedTransitions,
      improvedTransitions,
      latestStatus:
        history.statuses.at(-1) ?? "missing",
    };
  }).sort((a, b) =>
    b.regressed - a.regressed ||
    b.blocked - a.blocked ||
    b.worsenedTransitions - a.worsenedTransitions ||
    a.mapId.localeCompare(b.mapId)
  );

  const regressionTrends: PortfolioReleaseRegressionTrend[] = [
    ...regressionHistory.entries(),
  ].map(([key, item]) => ({
    key,
    mapId: item.mapId,
    kind: item.kind,
    regressionId: item.regressionId,
    occurrences: item.releaseIds.length,
    releaseIds: [...item.releaseIds],
  })).sort((a, b) =>
    b.occurrences - a.occurrences ||
    a.key.localeCompare(b.key)
  );

  const latestReleaseId =
    entries.at(-1)?.releaseId;
  const currentBlockers = regressionTrends
    .filter(
      (item) =>
        latestReleaseId !== undefined &&
        item.releaseIds.at(-1) === latestReleaseId,
    );

  return {
    releases: entries.length,
    blockedReleases: entries.filter(
      (entry) =>
        entry.manifest.disposition === "blocked",
    ).length,
    releaseEligibleReleases: entries.filter(
      (entry) =>
        entry.manifest.disposition ===
        "release-eligible",
    ).length,
    maps,
    recurringRegressions:
      regressionTrends.filter(
        (item) => item.occurrences >= 2,
      ),
    currentBlockers,
  };
}

export function portfolioReleaseIntelligenceText(
  intelligence: PortfolioReleaseIntelligence,
): string {
  const lines: string[] = [
    "Portfolio Release Intelligence",
    "- Releases: " + intelligence.releases,
    "- Release eligible: " +
      intelligence.releaseEligibleReleases,
    "- Blocked releases: " +
      intelligence.blockedReleases,
    "",
    "Map history",
  ];

  for (const map of intelligence.maps) {
    lines.push(
      "- " +
        map.mapId +
        ": latest=" +
        map.latestStatus +
        ", regressed=" +
        map.regressed +
        ", blocked=" +
        map.blocked +
        ", manual=" +
        map.manualRequired +
        ", worsenedTransitions=" +
        map.worsenedTransitions,
    );
  }

  lines.push("", "Recurring regressions");

  if (intelligence.recurringRegressions.length === 0) {
    lines.push("- none");
  } else {
    for (const item of intelligence.recurringRegressions) {
      lines.push(
        "- " +
          item.key +
          ": " +
          item.occurrences +
          " release(s)",
      );
    }
  }

  return lines.join("\n") + "\n";
}
