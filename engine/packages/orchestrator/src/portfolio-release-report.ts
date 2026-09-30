import type {
  PortfolioRegressionBatchRunResult,
  PortfolioRegressionMapRunResult,
} from "./portfolio-regression-batch-runner.js";
import {
  decidePortfolioRelease,
  type PortfolioMapReleaseDecision,
  type PortfolioReleaseDecision,
  type PortfolioReleaseGateOptions,
} from "./portfolio-release-gate.js";

export interface PortfolioReleaseManifestRegression {
  regressionId: string;
  scenarioId?: string;
  evidenceIds: readonly string[];
  reasons: readonly string[];
}

export interface PortfolioReleaseManifestMap {
  mapId: string;
  status: PortfolioMapReleaseDecision["status"];
  scheduledPriority?: PortfolioRegressionMapRunResult["scheduledPriority"];
  passed: readonly PortfolioReleaseManifestRegression[];
  regressed: readonly PortfolioReleaseManifestRegression[];
  blocked: readonly PortfolioReleaseManifestRegression[];
  manualRequired: readonly PortfolioReleaseManifestRegression[];
  evidenceIds: readonly string[];
  reasons: readonly string[];
}

export interface PortfolioReleaseManifest {
  schemaVersion: 1;
  updateVersion: string;
  disposition: PortfolioReleaseDecision["disposition"];
  requiredMapIds: readonly string[];
  totals: {
    maps: number;
    cleared: number;
    regressed: number;
    blocked: number;
    manualRequired: number;
    missing: number;
    regressionPassed: number;
    regressionRegressed: number;
    regressionBlocked: number;
    regressionManualRequired: number;
  };
  maps: readonly PortfolioReleaseManifestMap[];
  evidenceIds: readonly string[];
  reasons: readonly string[];
}

function regressionEntry(
  item: {
    regressionId: string;
    scenarioId?: string;
    evidenceIds: readonly string[];
    reasons: readonly string[];
  },
): PortfolioReleaseManifestRegression {
  return {
    regressionId: item.regressionId,
    ...(item.scenarioId === undefined
      ? {}
      : { scenarioId: item.scenarioId }),
    evidenceIds: [...new Set(item.evidenceIds)].sort(),
    reasons: [...item.reasons],
  };
}

function evidenceIdsForMap(
  item: PortfolioRegressionMapRunResult,
): string[] {
  return [
    ...new Set(
      [
        ...item.batch.passed,
        ...item.batch.regressed,
        ...item.batch.blocked,
        ...item.batch.manualRequired,
      ].flatMap((entry) => entry.evidenceIds),
    ),
  ].sort();
}

function manifestMap(
  decision: PortfolioMapReleaseDecision,
  run: PortfolioRegressionMapRunResult | undefined,
): PortfolioReleaseManifestMap {
  if (!run) {
    return {
      mapId: decision.mapId,
      status: decision.status,
      passed: [],
      regressed: [],
      blocked: [],
      manualRequired: [],
      evidenceIds: [],
      reasons: [...decision.reasons],
    };
  }

  return {
    mapId: decision.mapId,
    status: decision.status,
    scheduledPriority: run.scheduledPriority,
    passed: run.batch.passed
      .map(regressionEntry)
      .sort((a, b) =>
        a.regressionId.localeCompare(b.regressionId)
      ),
    regressed: run.batch.regressed
      .map(regressionEntry)
      .sort((a, b) =>
        a.regressionId.localeCompare(b.regressionId)
      ),
    blocked: run.batch.blocked
      .map(regressionEntry)
      .sort((a, b) =>
        a.regressionId.localeCompare(b.regressionId)
      ),
    manualRequired: run.batch.manualRequired
      .map(regressionEntry)
      .sort((a, b) =>
        a.regressionId.localeCompare(b.regressionId)
      ),
    evidenceIds: evidenceIdsForMap(run),
    reasons: [...decision.reasons],
  };
}

export function createPortfolioReleaseManifest(
  result: PortfolioRegressionBatchRunResult,
  options: PortfolioReleaseGateOptions = {},
): PortfolioReleaseManifest {
  const release = decidePortfolioRelease(
    result,
    options,
  );
  const byMap = new Map(
    result.maps.map((item) => [
      item.mapId,
      item,
    ]),
  );

  const maps = release.maps
    .map((decision) =>
      manifestMap(
        decision,
        byMap.get(decision.mapId),
      )
    )
    .sort((a, b) =>
      a.mapId.localeCompare(b.mapId)
    );

  const evidenceIds = [
    ...new Set(
      maps.flatMap((item) => item.evidenceIds),
    ),
  ].sort();

  const count = (
    status: PortfolioMapReleaseDecision["status"],
  ): number =>
    maps.filter((item) => item.status === status)
      .length;

  return {
    schemaVersion: 1,
    updateVersion: release.updateVersion,
    disposition: release.disposition,
    requiredMapIds: [...release.requiredMapIds],
    totals: {
      maps: maps.length,
      cleared: count("cleared"),
      regressed: count("regressed"),
      blocked: count("blocked"),
      manualRequired: count("manual-required"),
      missing: count("missing"),
      regressionPassed: result.passed,
      regressionRegressed: result.regressed,
      regressionBlocked: result.blocked,
      regressionManualRequired:
        result.manualRequired,
    },
    maps,
    evidenceIds,
    reasons: [...release.reasons],
  };
}

export function portfolioReleaseManifestJson(
  manifest: PortfolioReleaseManifest,
): string {
  return JSON.stringify(manifest, null, 2) + "\n";
}

export function portfolioReleaseReportText(
  manifest: PortfolioReleaseManifest,
): string {
  const lines: string[] = [
    "Portfolio Release Report",
    "Update: " + manifest.updateVersion,
    "Decision: " + manifest.disposition,
    "",
    "Summary",
    "- Maps: " + manifest.totals.maps,
    "- Cleared: " + manifest.totals.cleared,
    "- Regressed: " + manifest.totals.regressed,
    "- Blocked: " + manifest.totals.blocked,
    "- Manual required: " +
      manifest.totals.manualRequired,
    "- Missing: " + manifest.totals.missing,
    "",
    "Regression Results",
    "- Passed: " +
      manifest.totals.regressionPassed,
    "- Regressed: " +
      manifest.totals.regressionRegressed,
    "- Blocked: " +
      manifest.totals.regressionBlocked,
    "- Manual required: " +
      manifest.totals.regressionManualRequired,
  ];

  for (const map of manifest.maps) {
    lines.push(
      "",
      map.mapId +
        " [" +
        map.status +
        "]" +
        (map.scheduledPriority === undefined
          ? ""
          : " " + map.scheduledPriority),
    );

    for (const entry of map.regressed) {
      lines.push(
        "- REGRESSED " +
          entry.regressionId +
          (entry.evidenceIds.length === 0
            ? ""
            : " evidence=" +
              entry.evidenceIds.join(",")),
      );
    }
    for (const entry of map.blocked) {
      lines.push(
        "- BLOCKED " + entry.regressionId,
      );
    }
    for (const entry of map.manualRequired) {
      lines.push(
        "- MANUAL " + entry.regressionId,
      );
    }
    for (const entry of map.passed) {
      lines.push(
        "- PASSED " +
          entry.regressionId +
          (entry.evidenceIds.length === 0
            ? ""
            : " evidence=" +
              entry.evidenceIds.join(",")),
      );
    }
    if (
      map.passed.length === 0 &&
      map.regressed.length === 0 &&
      map.blocked.length === 0 &&
      map.manualRequired.length === 0
    ) {
      lines.push("- " + map.reasons.join(" "));
    }
  }

  lines.push(
    "",
    "Release Decision",
    ...manifest.reasons.map(
      (reason) => "- " + reason,
    ),
  );

  return lines.join("\n") + "\n";
}
