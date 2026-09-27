import {
  describe,
  expect,
  it,
} from "vitest";
import type {
  PortfolioReleaseManifest,
} from "../src/index.js";
import {
  analyzePortfolioReleaseHistory,
  portfolioReleaseIntelligenceText,
} from "../src/index.js";

function manifest(
  a:
    PortfolioReleaseManifest["maps"][number]["status"],
  b:
    PortfolioReleaseManifest["maps"][number]["status"],
  recurring = false,
): PortfolioReleaseManifest {
  const map = (
    mapId: string,
    status:
      PortfolioReleaseManifest["maps"][number]["status"],
  ) => ({
    mapId,
    status,
    passed: [],
    regressed:
      status === "regressed"
        ? [{
            regressionId:
              recurring
                ? "reg:repeat"
                : "reg:" + mapId,
            evidenceIds: ["e"],
            reasons: [],
          }]
        : [],
    blocked:
      status === "blocked"
        ? [{
            regressionId: "reg:block",
            evidenceIds: [],
            reasons: [],
          }]
        : [],
    manualRequired:
      status === "manual-required"
        ? [{
            regressionId: "reg:manual",
            evidenceIds: [],
            reasons: [],
          }]
        : [],
    evidenceIds: [],
    reasons: [],
  });

  return {
    schemaVersion: 1,
    updateVersion: "1.26.40",
    disposition:
      a === "cleared" &&
      b === "cleared"
        ? "release-eligible"
        : "blocked",
    requiredMapIds: ["a", "b"],
    totals: {
      maps: 2,
      cleared: 0,
      regressed: 0,
      blocked: 0,
      manualRequired: 0,
      missing: 0,
      regressionPassed: 0,
      regressionRegressed: 0,
      regressionBlocked: 0,
      regressionManualRequired: 0,
    },
    maps: [
      map("a", a),
      map("b", b),
    ],
    evidenceIds: [],
    reasons: [],
  };
}

describe("portfolio release intelligence", () => {
  it("tracks map instability using explicit status counts and transitions", () => {
    const intelligence =
      analyzePortfolioReleaseHistory([
        {
          releaseId: "r1",
          manifest:
            manifest("cleared", "blocked"),
        },
        {
          releaseId: "r2",
          manifest:
            manifest("regressed", "cleared"),
        },
        {
          releaseId: "r3",
          manifest:
            manifest("cleared", "cleared"),
        },
      ]);

    const a = intelligence.maps.find(
      (item) => item.mapId === "a",
    )!;

    expect(a.regressed).toBe(1);
    expect(a.worsenedTransitions).toBe(1);
    expect(a.improvedTransitions).toBe(1);
    expect(a.latestStatus).toBe("cleared");
  });

  it("identifies recurring historical regressions without opaque scoring", () => {
    const intelligence =
      analyzePortfolioReleaseHistory([
        {
          releaseId: "r1",
          manifest:
            manifest("regressed", "cleared", true),
        },
        {
          releaseId: "r2",
          manifest:
            manifest("cleared", "cleared", true),
        },
        {
          releaseId: "r3",
          manifest:
            manifest("regressed", "cleared", true),
        },
      ]);

    expect(
      intelligence.recurringRegressions
        .map((item) => ({
          key: item.key,
          occurrences: item.occurrences,
        })),
    ).toEqual([{
      key: "a::regressed::reg:repeat",
      occurrences: 2,
    }]);
  });

  it("reports current blockers only from the latest release snapshot", () => {
    const intelligence =
      analyzePortfolioReleaseHistory([
        {
          releaseId: "r1",
          manifest:
            manifest("regressed", "cleared"),
        },
        {
          releaseId: "r2",
          manifest:
            manifest("cleared", "blocked"),
        },
      ]);

    expect(
      intelligence.currentBlockers
        .map((item) => item.key),
    ).toEqual([
      "b::blocked::reg:block",
    ]);
  });

  it("renders human-readable intelligence from the same aggregate authority", () => {
    const text =
      portfolioReleaseIntelligenceText(
        analyzePortfolioReleaseHistory([{
          releaseId: "r1",
          manifest:
            manifest("cleared", "cleared"),
        }]),
      );

    expect(text).toContain(
      "Portfolio Release Intelligence",
    );
    expect(text).toContain(
      "a: latest=cleared",
    );
  });

  it("rejects duplicate release ids", () => {
    const current =
      manifest("cleared", "cleared");

    expect(() =>
      analyzePortfolioReleaseHistory([
        {
          releaseId: "same",
          manifest: current,
        },
        {
          releaseId: "same",
          manifest: current,
        },
      ])
    ).toThrow(/Duplicate/);
  });
});
