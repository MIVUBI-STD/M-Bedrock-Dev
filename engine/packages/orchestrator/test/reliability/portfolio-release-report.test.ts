import { describe, expect, it } from "vitest";
import type {
  PortfolioRegressionBatchRunResult,
} from "../../src/index.js";
import {
  createPortfolioReleaseManifest,
  portfolioReleaseManifestJson,
  portfolioReleaseReportText,
} from "../../src/index.js";

const batch: PortfolioRegressionBatchRunResult = {
  updateVersion: "1.26.40",
  maps: [{
    mapId: "blitz-build",
    scheduledPriority: "P0",
    batch: {
      mapId: "blitz-build",
      updateVersion: "1.26.40",
      passed: [{
        regressionId: "reg:reconnect",
        scenarioId: "scenario:reconnect",
        status: "passed",
        evidenceIds: [
          "runtime:z",
          "runtime:a",
        ],
        reasons: ["passed"],
      }],
      regressed: [],
      blocked: [],
      manualRequired: [],
    },
    feedback: {
      plan: {
        mapId: "blitz-build",
        updateVersion: "1.26.40",
        priority: "P0",
        reasons: [],
        suggestedLanes: ["runtime"],
        affectedDomains: ["multiplayer"],
      },
      addedReasons: [],
      addedDomains: [],
    },
  }, {
    mapId: "defense",
    scheduledPriority: "P1",
    batch: {
      mapId: "defense",
      updateVersion: "1.26.40",
      passed: [],
      regressed: [{
        regressionId: "reg:cleanup",
        scenarioId: "scenario:cleanup",
        status: "regressed",
        evidenceIds: ["runtime:cleanup"],
        reasons: ["regressed"],
      }],
      blocked: [],
      manualRequired: [],
    },
    feedback: {
      plan: {
        mapId: "defense",
        updateVersion: "1.26.40",
        priority: "P1",
        reasons: [],
        suggestedLanes: ["runtime"],
        affectedDomains: ["state"],
      },
      addedReasons: [],
      addedDomains: [],
    },
  }],
  passed: 1,
  regressed: 1,
  blocked: 0,
  manualRequired: 0,
};

describe("portfolio release report", () => {
  it("creates a deterministic evidence manifest from batch and release authority", () => {
    const manifest =
      createPortfolioReleaseManifest(batch);

    expect(manifest.disposition).toBe(
      "blocked",
    );
    expect(manifest.totals).toMatchObject({
      maps: 2,
      cleared: 1,
      regressed: 1,
      regressionPassed: 1,
      regressionRegressed: 1,
    });
    expect(manifest.evidenceIds).toEqual([
      "runtime:a",
      "runtime:cleanup",
      "runtime:z",
    ]);
    expect(
      manifest.maps.map((item) => item.mapId),
    ).toEqual([
      "blitz-build",
      "defense",
    ]);
  });

  it("serializes machine-readable manifest with stable trailing newline", () => {
    const manifest =
      createPortfolioReleaseManifest(batch);
    const json =
      portfolioReleaseManifestJson(manifest);

    expect(json.endsWith("\n")).toBe(true);
    expect(
      JSON.parse(json).schemaVersion,
    ).toBe(1);
  });

  it("renders a human-readable report from the manifest authority", () => {
    const report = portfolioReleaseReportText(
      createPortfolioReleaseManifest(batch),
    );

    expect(report).toContain(
      "Decision: blocked",
    );
    expect(report).toContain(
      "defense [regressed] P1",
    );
    expect(report).toContain(
      "REGRESSED reg:cleanup evidence=runtime:cleanup",
    );
    expect(report).toContain(
      "PASSED reg:reconnect evidence=runtime:a,runtime:z",
    );
  });

  it("records explicitly required missing maps in the same manifest", () => {
    const manifest =
      createPortfolioReleaseManifest(
        batch,
        {
          requiredMapIds: [
            "blitz-build",
            "defense",
            "fall-of-pillager",
          ],
        },
      );

    expect(manifest.totals.missing).toBe(1);
    expect(
      manifest.maps.find(
        (item) =>
          item.mapId ===
          "fall-of-pillager",
      )?.status,
    ).toBe("missing");
  });
});
