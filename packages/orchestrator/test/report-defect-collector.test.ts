import {
  describe,
  expect,
  it,
} from "vitest";
import type {
  IntentDiagnosticGateResult,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import type {
  GameplayIntentRuntimeAssessment,
} from "../src/gameplay-intent-runtime-stage.js";
import {
  buildBugReportFromAuditCandidates,
  collectConfirmedDefects,
} from "../src/report-defect-collector.js";

const intent: GameplayIntentModel = {
  schemaVersion: 1,
  id: "intent",
  evidence: [{
    id: "intent:evidence",
    origin: "source-code",
    locator: "scripts/session.ts",
    summary: "Authored cleanup contract.",
  }],
  nodes: [{
    id: "outcome:cleanup",
    kind: "outcome",
    label: "Cleanup",
    status: "authored",
    evidenceIds: ["intent:evidence"],
  }],
  edges: [],
  invariants: [{
    id: "inv:cleanup",
    statement: "Cleanup must reset match state.",
    strength: "must",
    status: "authored",
    subjectIds: ["outcome:cleanup"],
    evidenceIds: ["intent:evidence"],
  }],
  unknowns: [],
};

const runtimeAssessment: GameplayIntentRuntimeAssessment = {
  outcomeObservation: {
    outcomeId: "outcome:cleanup",
    evidenceId: "runtime:cleanup",
  },
  result: {
    disposition: "confirmed-defect",
    subjectIds: ["outcome:cleanup"],
    basisInvariantIds: ["inv:cleanup"],
    evidenceIds: ["runtime:cleanup"],
    nextEvidenceNeed: "none",
    reasons: ["Runtime state contradicts authored cleanup intent."],
  },
  observationNeeds: [],
};

const staticResult: IntentDiagnosticGateResult = {
  disposition: "confirmed-defect",
  subjectIds: ["outcome:cleanup"],
  basisInvariantIds: ["inv:cleanup"],
  evidenceIds: ["static:cleanup"],
  nextEvidenceNeed: "none",
  reasons: ["Static implementation contradicts authored cleanup intent."],
};

const baseBug = {
  severity: "major" as const,
  category: "player-state" as const,
  title: "Cleanup retains match state",
  problem: "Match-owned state remains after cleanup.",
  expected: "Match-owned state is reset.",
  observed: "Previous match state remains active.",
};

describe("report defect collector", () => {
  it("collects confirmed defects from all three evidence routes", () => {
    const result = collectConfirmedDefects([
      {
        route: "runtime",
        intent,
        assessment: runtimeAssessment,
        bug: {
          ...baseBug,
          id: "BUG-RUN-001",
          aiAnalysis: "Runtime cleanup contradicts the authored invariant.",
          relevantCode: [{
            file: "scripts/session.ts",
            reason: "Owns match cleanup.",
          }],
        },
      },
      {
        route: "static",
        intent,
        result: staticResult,
        bug: {
          ...baseBug,
          id: "BUG-STA-001",
          aiAnalysis: "Static cleanup path omits the required reset.",
          relevantCode: [{
            file: "scripts/session.ts",
            reason: "Owns match cleanup.",
          }],
        },
      },
      {
        route: "tester",
        confirmation: {
          expectedBehaviorAuthority: "explicit-requirement",
          reproduced: true,
          evidence: "State persists after two repeated match completions.",
        },
        bug: {
          ...baseBug,
          id: "BUG-TST-001",
          reproduction: [
            "Complete a match.",
            "Return to lobby.",
            "Start another match.",
          ],
        },
      },
    ]);

    expect(result.confirmed).toHaveLength(3);
    expect(result.rejected).toHaveLength(0);
    expect(
      result.confirmed.map((bug) => bug.foundBy),
    ).toEqual(["ai", "ai", "tester"]);
  });

  it("keeps non-confirmed candidates out of the final report", () => {
    const result = buildBugReportFromAuditCandidates({
      map: {
        name: "Map",
        mapVersion: "1.0.0",
        baseVersion: "1.26.20",
        testedVersion: "1.26.32",
      },
      repairBy: "developer",
      candidates: [
        {
          route: "runtime",
          intent,
          assessment: {
            ...runtimeAssessment,
            result: {
              ...runtimeAssessment.result,
              disposition: "probable-defect",
              basisInvariantIds: [],
              nextEvidenceNeed: "authored-intent",
            },
          },
          bug: {
            ...baseBug,
            id: "BUG-REJECT-001",
            aiAnalysis: "Evidence remains incomplete.",
            relevantCode: [{
              file: "scripts/session.ts",
              reason: "Possible cleanup path.",
            }],
          },
        },
        {
          route: "tester",
          confirmation: {
            expectedBehaviorAuthority: "explicit-requirement",
            reproduced: true,
            evidence: "The state persists after repeated completion.",
          },
          bug: {
            ...baseBug,
            id: "BUG-TST-002",
            reproduction: [
              "Complete a match.",
              "Observe retained state.",
            ],
          },
        },
      ],
    });

    expect(result.collection.confirmed).toHaveLength(1);
    expect(result.collection.rejected).toEqual([
      expect.objectContaining({
        route: "runtime",
        bugId: "BUG-REJECT-001",
      }),
    ]);
    expect(result.promotion.ok).toBe(true);
    if (!result.promotion.ok) return;
    expect(
      result.promotion.report.bugs.map((bug) => bug.id),
    ).toEqual(["BUG-TST-002"]);
  });

  it("does not auto-merge duplicate defect candidates", () => {
    const collection = collectConfirmedDefects([
      {
        route: "tester",
        confirmation: {
          expectedBehaviorAuthority: "explicit-requirement",
          reproduced: true,
          evidence: "First observation.",
        },
        bug: {
          ...baseBug,
          id: "BUG-DUP-001",
          reproduction: ["Reproduce once."],
        },
      },
      {
        route: "tester",
        confirmation: {
          expectedBehaviorAuthority: "explicit-requirement",
          reproduced: true,
          evidence: "Second observation.",
        },
        bug: {
          ...baseBug,
          id: "BUG-DUP-001",
          reproduction: ["Reproduce twice."],
        },
      },
    ]);

    expect(collection.confirmed).toHaveLength(2);

    const report = buildBugReportFromAuditCandidates({
      map: {
        name: "Map",
        mapVersion: "1.0.0",
        baseVersion: "1.26.20",
        testedVersion: "1.26.20",
      },
      repairBy: "developer",
      candidates: [
        {
          route: "tester",
          confirmation: {
            expectedBehaviorAuthority: "explicit-requirement",
            reproduced: true,
            evidence: "First observation.",
          },
          bug: {
            ...baseBug,
            id: "BUG-DUP-001",
            reproduction: ["Reproduce once."],
          },
        },
        {
          route: "tester",
          confirmation: {
            expectedBehaviorAuthority: "explicit-requirement",
            reproduced: true,
            evidence: "Second observation.",
          },
          bug: {
            ...baseBug,
            id: "BUG-DUP-001",
            reproduction: ["Reproduce twice."],
          },
        },
      ],
    });

    expect(report.promotion.ok).toBe(false);
    if (report.promotion.ok) return;
    expect(
      report.promotion.issues.map((issue) => issue.code),
    ).toContain("duplicate-bug-id");
  });
});
