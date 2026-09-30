import { describe, expect, it } from "vitest";
import {
  validationScenarioForDefect,
} from "../src/defect-regression-scenario.js";

describe("defect regression scenario", () => {
  it("creates focused reparse, diagnostic, and topology checks", () => {
    const scenario =
      validationScenarioForDefect({
        id: "BUG-ARENA-1",
        title: "Arena replica diverges",
        brokenInvariantIds: [
          "arena.replica-equivalence",
        ],
        diagnosticCode:
          "ARENA_REPLICA_DIVERGENCE",
        topologySensitive: true,
        primarySource: {
          artifactId: "artifact:test",
          relativePath: "scripts/arena.ts",
        },
      });

    expect(
      scenario.steps.map((step) => step.kind),
    ).toEqual([
      "reparse",
      "rebuild-graph",
      "rerun-diagnostic",
      "topology-compare",
    ]);
  });
});
