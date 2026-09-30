import type {
  PortfolioRegressionBatchRunResult,
  PortfolioRegressionMapRunResult,
} from "./portfolio-regression-batch-runner.js";

export type PortfolioReleaseDisposition =
  | "release-eligible"
  | "blocked";

export type PortfolioMapReleaseStatus =
  | "cleared"
  | "regressed"
  | "blocked"
  | "manual-required"
  | "missing";

export interface PortfolioMapReleaseDecision {
  mapId: string;
  status: PortfolioMapReleaseStatus;
  reasons: readonly string[];
}

export interface PortfolioReleaseDecision {
  updateVersion: string;
  disposition: PortfolioReleaseDisposition;
  requiredMapIds: readonly string[];
  maps: readonly PortfolioMapReleaseDecision[];
  reasons: readonly string[];
}

export interface PortfolioReleaseGateOptions {
  requiredMapIds?: readonly string[];
}

function mapReleaseDecision(
  item: PortfolioRegressionMapRunResult,
): PortfolioMapReleaseDecision {
  if (item.batch.regressed.length > 0) {
    return {
      mapId: item.mapId,
      status: "regressed",
      reasons: [
        "Historical regression reproduced: " +
          item.batch.regressed
            .map((entry) => entry.regressionId)
            .sort()
            .join(", ") +
          ".",
      ],
    };
  }

  if (item.batch.blocked.length > 0) {
    return {
      mapId: item.mapId,
      status: "blocked",
      reasons: [
        "One or more required regression executions are blocked: " +
          item.batch.blocked
            .map((entry) => entry.regressionId)
            .sort()
            .join(", ") +
          ".",
      ],
    };
  }

  if (item.batch.manualRequired.length > 0) {
    return {
      mapId: item.mapId,
      status: "manual-required",
      reasons: [
        "One or more selected regressions still require manual execution: " +
          item.batch.manualRequired
            .map((entry) => entry.regressionId)
            .sort()
            .join(", ") +
          ".",
      ],
    };
  }

  return {
    mapId: item.mapId,
    status: "cleared",
    reasons: [
      "No historical regression reproduced and no selected regression remains blocked or manual.",
    ],
  };
}

export function decidePortfolioRelease(
  result: PortfolioRegressionBatchRunResult,
  options: PortfolioReleaseGateOptions = {},
): PortfolioReleaseDecision {
  const byMap = new Map(
    result.maps.map((item) => [
      item.mapId,
      item,
    ]),
  );

  const requiredMapIds = [
    ...new Set(
      options.requiredMapIds ??
        result.maps.map((item) => item.mapId),
    ),
  ].sort();

  const maps: PortfolioMapReleaseDecision[] =
    requiredMapIds.map((mapId) => {
      const item = byMap.get(mapId);
      if (!item) {
        return {
          mapId,
          status: "missing" as const,
          reasons: [
            "Required map has no portfolio regression batch result.",
          ],
        };
      }
      return mapReleaseDecision(item);
    });

  const blocking = maps.filter(
    (item) => item.status !== "cleared",
  );

  if (blocking.length > 0) {
    return {
      updateVersion: result.updateVersion,
      disposition: "blocked",
      requiredMapIds,
      maps,
      reasons: [
        "Portfolio release is blocked by unresolved map regression status.",
        ...blocking.map(
          (item) =>
            item.mapId +
            ": " +
            item.status +
            ".",
        ),
      ],
    };
  }

  return {
    updateVersion: result.updateVersion,
    disposition: "release-eligible",
    requiredMapIds,
    maps,
    reasons: [
      "All required maps are cleared of selected historical regressions.",
    ],
  };
}

export function assertPortfolioReleaseEligible(
  decision: PortfolioReleaseDecision,
): void {
  if (decision.disposition === "release-eligible") {
    return;
  }

  throw new Error(
    "Portfolio release blocked: " +
      decision.reasons.join("; "),
  );
}
