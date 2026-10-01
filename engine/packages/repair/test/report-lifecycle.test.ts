import {
  describe,
  expect,
  it,
} from "vitest";
import type {
  BugReportV2,
} from "../../bug-report/src/index.js";
import type {
  ValidationTraceReport,
} from "../../validation/src/index.js";
import {
  completeVerifiedBugRepair,
  selectBugRepairTarget,
} from "../src/index.js";

function report(): BugReportV2 {
  return {
    schema: "m-bedrock-bug-report/v2",
    map: {
      name: "Arena",
      mapVersion: "1.0.0",
      drive: "https://drive.google.com/file/d/map/view",
      baseVersion: "1.26.20",
      testedVersion: "1.26.32",
    },
    repairBy: "developer",
    bugs: [{
      id: "BUG-001",
      fixed: false,
      severity: "major",
      category: "game-flow",
      foundBy: "tester",
      title: "Round cannot continue",
      problem: "The next round never starts.",
      expected: "The next round starts.",
      observed: "The game remains stuck.",
      suggestedFix: "Restore the round transition.",
      mustPreserve: ["Existing score state."],
    }],
  };
}

function trace(overrides: Partial<ValidationTraceReport["runs"][number]> = {}): ValidationTraceReport {
  return {
    runs: [{
      runId: "run:1",
      scenarioId: "scenario:1",
      scenarioRevision: "rev-1",
      intentInvariantIds: ["intent:round-flow", "intent:score-state"],
      ok: true,
      proofLevel: "LIVE GAME VERIFIED",
      current: true,
      staleReasons: [],
      evidenceIds: ["evidence:1"],
      ...overrides,
    }],
    invariants: [{
      invariantId: "intent:score-state",
      scenarioIds: ["scenario:1"],
      runIds: ["run:1"],
      currentPassingRunIds: ["run:1"],
      current: true,
    }],
  };
}

describe("report to repair lifecycle", () => {
  it("creates a repair target only for the report owner", () => {
    expect(
      selectBugRepairTarget(report(), "BUG-001", "developer"),
    ).toMatchObject({
      bugId: "BUG-001",
      repairBy: "developer",
      suggestedFix: "Restore the round transition.",
    });

    expect(() =>
      selectBugRepairTarget(report(), "BUG-001", "chatgpt")
    ).toThrow(/Repair By owner/);
  });

  it("marks a bug fixed only after current passing validation with evidence", () => {
    const completed = completeVerifiedBugRepair(
      report(),
      {
        bugId: "BUG-001",
        validationRunIds: ["run:1"],
        preservationInvariantIds: ["intent:score-state"],
      },
      trace(),
    );

    expect(completed.bugs[0]?.fixed).toBe(true);
  });

  it("rejects stale, failing, or evidence-free validation", () => {
    expect(() =>
      completeVerifiedBugRepair(
        report(),
        {
          bugId: "BUG-001",
          validationRunIds: ["run:1"],
        },
        trace({
          current: false,
          staleReasons: ["artifact changed"],
        }),
      )
    ).toThrow(/current passing validation with evidence/);

    expect(() =>
      completeVerifiedBugRepair(
        report(),
        {
          bugId: "BUG-001",
          validationRunIds: ["run:1"],
        },
        trace({
          evidenceIds: [],
        }),
      )
    ).toThrow(/current passing validation with evidence/);
  });
  it("requires explicit current coverage for Must Preserve behavior", () => {
    expect(() =>
      completeVerifiedBugRepair(
        report(),
        {
          bugId: "BUG-001",
          validationRunIds: ["run:1"],
        },
        trace(),
      )
    ).toThrow(/preservation invariant IDs/);

    expect(() =>
      completeVerifiedBugRepair(
        report(),
        {
          bugId: "BUG-001",
          validationRunIds: ["run:1"],
          preservationInvariantIds: ["intent:missing"],
        },
        trace(),
      )
    ).toThrow(/not currently validated/);
  });

});
