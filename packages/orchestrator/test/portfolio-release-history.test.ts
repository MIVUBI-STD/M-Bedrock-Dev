import {
  mkdtemp,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";
import type {
  PortfolioReleaseManifest,
} from "../src/index.js";
import {
  comparePortfolioReleaseManifests,
  loadPortfolioReleaseManifest,
  persistPortfolioReleaseManifest,
} from "../src/index.js";

function manifest(
  statusA:
    PortfolioReleaseManifest["maps"][number]["status"],
  statusB:
    PortfolioReleaseManifest["maps"][number]["status"],
): PortfolioReleaseManifest {
  return {
    schemaVersion: 1,
    updateVersion: "1.26.40",
    disposition:
      statusA === "cleared" &&
      statusB === "cleared"
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
    maps: [{
      mapId: "a",
      status: statusA,
      passed: [],
      regressed:
        statusA === "regressed"
          ? [{
              regressionId: "reg:old",
              evidenceIds: ["e"],
              reasons: [],
            }]
          : [],
      blocked: [],
      manualRequired: [],
      evidenceIds: [],
      reasons: [],
    }, {
      mapId: "b",
      status: statusB,
      passed: [],
      regressed: [],
      blocked:
        statusB === "blocked"
          ? [{
              regressionId: "reg:block",
              evidenceIds: [],
              reasons: [],
            }]
          : [],
      manualRequired: [],
      evidenceIds: [],
      reasons: [],
    }],
    evidenceIds: [],
    reasons: [],
  };
}

describe(
  "portfolio release history",
  () => {
    it(
      "persists immutable release manifests and loads them back",
      async () => {
        const root = await mkdtemp(
          join(tmpdir(), "m-bedrock-release-"),
        );

        try {
          const current =
            manifest("cleared", "blocked");

          await persistPortfolioReleaseManifest({
            historyRoot: root,
            releaseId: "release-1",
            manifest: current,
          });

          const loaded =
            await loadPortfolioReleaseManifest(
              root,
              "release-1",
            );

          expect(loaded).toEqual(current);

          await expect(
            persistPortfolioReleaseManifest({
              historyRoot: root,
              releaseId: "release-1",
              manifest: current,
            }),
          ).rejects.toThrow(/already exists/);
        } finally {
          await rm(root, {
            recursive: true,
            force: true,
          });
        }
      },
    );

    it(
      "compares map status and regression deltas between releases",
      () => {
        const before =
          manifest("regressed", "blocked");
        const after =
          manifest("cleared", "cleared");

        const comparison =
          comparePortfolioReleaseManifests(
            "release-1",
            before,
            "release-2",
            after,
          );

        expect(
          comparison.improvedMapIds,
        ).toEqual(["a", "b"]);
        expect(
          comparison.worsenedMapIds,
        ).toEqual([]);
        expect(
          comparison.resolvedRegressions,
        ).toEqual([
          "a::regressed::reg:old",
          "b::blocked::reg:block",
        ]);
        expect(
          comparison.toDisposition,
        ).toBe("release-eligible");
      },
    );

    it(
      "rejects unsafe release history ids",
      async () => {
        const root = await mkdtemp(
          join(tmpdir(), "m-bedrock-release-"),
        );

        try {
          await expect(
            persistPortfolioReleaseManifest({
              historyRoot: root,
              releaseId: "../bad",
              manifest:
                manifest("cleared", "cleared"),
            }),
          ).rejects.toThrow(/Unsafe/);
        } finally {
          await rm(root, {
            recursive: true,
            force: true,
          });
        }
      },
    );
  },
);
