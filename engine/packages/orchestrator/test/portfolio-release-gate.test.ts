import { describe, expect, it } from "vitest";
import type {
  PortfolioRegressionBatchRunResult,
  PortfolioRegressionMapRunResult,
} from "../src/index.js";
import {
  decidePortfolioRelease,
} from "../src/index.js";

function mapResult(
  mapId: string,
  status:
    | "cleared"
    | "regressed"
    | "blocked"
    | "manual",
): PortfolioRegressionMapRunResult {
  return {
    mapId,
    scheduledPriority: "P1",
    batch: {
      mapId,
      updateVersion: "1.26.40",
      passed:
        status === "cleared"
          ? [{
              regressionId: "reg:ok",
              status: "passed",
              evidenceIds: ["e"],
              reasons: [],
            }]
          : [],
      regressed:
        status === "regressed"
          ? [{
              regressionId: "reg:old-bug",
              status: "regressed",
              evidenceIds: ["e"],
              reasons: [],
            }]
          : [],
      blocked:
        status === "blocked"
          ? [{
              regressionId: "reg:blocked",
              status: "blocked",
              evidenceIds: [],
              reasons: [],
            }]
          : [],
      manualRequired:
        status === "manual"
          ? [{
              regressionId: "reg:manual",
              status: "manual-required",
              evidenceIds: [],
              reasons: [],
            }]
          : [],
    },
    feedback: {
      plan: {
        mapId,
        updateVersion: "1.26.40",
        priority: "P1",
        reasons: [],
        suggestedLanes: ["runtime"],
        affectedDomains: [],
      },
      addedReasons: [],
      addedDomains: [],
    },
  };
}

function batch(
  maps: PortfolioRegressionMapRunResult[],
): PortfolioRegressionBatchRunResult {
  return {
    updateVersion: "1.26.40",
    maps,
    passed: maps.reduce(
      (sum, item) =>
        sum + item.batch.passed.length,
      0,
    ),
    regressed: maps.reduce(
      (sum, item) =>
        sum + item.batch.regressed.length,
      0,
    ),
    blocked: maps.reduce(
      (sum, item) =>
        sum + item.batch.blocked.length,
      0,
    ),
    manualRequired: maps.reduce(
      (sum, item) =>
        sum +
        item.batch.manualRequired.length,
      0,
    ),
  };
}

describe("portfolio release gate", () => {
  it("releases only when every required map is cleared", () => {
    const decision = decidePortfolioRelease(
      batch([
        mapResult("blitz-build", "cleared"),
        mapResult("defense", "cleared"),
      ]),
    );

    expect(decision.disposition).toBe(
      "release-eligible",
    );
    expect(
      decision.maps.every(
        (item) => item.status === "cleared",
      ),
    ).toBe(true);
  });

  it("blocks the whole release when one historical regression reproduces", () => {
    const decision = decidePortfolioRelease(
      batch([
        mapResult("blitz-build", "cleared"),
        mapResult("defense", "regressed"),
      ]),
    );

    expect(decision.disposition).toBe(
      "blocked",
    );
    expect(
      decision.maps.find(
        (item) => item.mapId === "defense",
      )?.status,
    ).toBe("regressed");
  });

  it("blocks unresolved runtime and manual regression work", () => {
    const decision = decidePortfolioRelease(
      batch([
        mapResult("a", "blocked"),
        mapResult("b", "manual"),
      ]),
    );

    expect(decision.disposition).toBe(
      "blocked",
    );
    expect(
      decision.maps.map(
        (item) => item.status,
      ),
    ).toEqual([
      "blocked",
      "manual-required",
    ]);
  });

  it("blocks when an explicitly required map is missing from the batch", () => {
    const decision = decidePortfolioRelease(
      batch([
        mapResult("blitz-build", "cleared"),
      ]),
      {
        requiredMapIds: [
          "blitz-build",
          "defense",
        ],
      },
    );

    expect(decision.disposition).toBe(
      "blocked",
    );
    expect(
      decision.maps.find(
        (item) => item.mapId === "defense",
      )?.status,
    ).toBe("missing");
  });
});
