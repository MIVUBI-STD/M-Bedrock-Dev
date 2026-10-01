import {
  describe,
  expect,
  it,
} from "vitest";
import {
  deriveReportDefectClassification,
} from "../../src/reporting/report-defect-classification.js";

describe("report defect classification", () => {
  it("derives a major player-state defect from structured signals", () => {
    const result = deriveReportDefectClassification({
      impact: [{
        kind: "important-state-wrong",
        evidenceIds: ["runtime:inventory"],
      }],
      primaryFailure: [{
        failure: "player-owned-state",
        evidenceIds: ["intent:inventory"],
      }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.impact).toEqual({
      progression: "unaffected",
      recovery: "normal",
      stability: "stable",
      coreMechanic: "correct",
      importantState: "materially-wrong",
      fairness: "unaffected",
    });
    expect(result.primaryFailure)
      .toBe("player-owned-state");
  });

  it("derives blocker impact only from blocker-level signals", () => {
    const result = deriveReportDefectClassification({
      impact: [{
        kind: "progression-blocked",
        evidenceIds: ["runtime:blocked"],
      }],
      primaryFailure: [{
        failure: "game-progression",
        evidenceIds: ["intent:progression"],
      }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.impact.progression)
      .toBe("blocked");
  });

  it("rejects ambiguous primary failure signals", () => {
    const result = deriveReportDefectClassification({
      impact: [{
        kind: "important-state-wrong",
        evidenceIds: ["runtime:state"],
      }],
      primaryFailure: [
        {
          failure: "player-owned-state",
          evidenceIds: ["intent:state"],
        },
        {
          failure: "session-concurrency",
          evidenceIds: ["intent:session"],
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons.join(" "))
      .toMatch(/ambiguous/);
  });

  it("rejects ungrounded signals", () => {
    const result = deriveReportDefectClassification({
      impact: [{
        kind: "fairness-affected",
        evidenceIds: [],
      }],
      primaryFailure: [{
        failure: "combat-rule",
        evidenceIds: ["intent:combat"],
      }],
    });

    expect(result.ok).toBe(false);
  });
});
