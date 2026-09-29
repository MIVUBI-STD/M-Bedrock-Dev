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
  groupConfirmedDefects,
} from "../../bug-report/src/index.js";
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

function defect(
  label: string,
  options: {
    ai?: boolean;
    reproduction?: readonly string[];
    expectedAuthority?:
      | "authored-intent"
      | "explicit-requirement"
      | "runtime-contract";
    expectedEvidenceIds?: readonly string[];
  } = {},
) {
  return {
    impact: {
      progression: "degraded" as const,
      recovery: "normal" as const,
      stability: "stable" as const,
      coreMechanic: "correct" as const,
      importantState: "materially-wrong" as const,
      fairness: "unaffected" as const,
    },
    primaryFailure: "player-owned-state" as const,
    title: "Cleanup retains match state",
    problem: "Match-owned state remains after cleanup.",
    expected: {
      authority:
        options.expectedAuthority ??
        ("authored-intent" as const),
      statement: "Match-owned state is reset.",
      evidenceIds:
        options.expectedEvidenceIds ??
        ["intent:evidence"],
    },
    observed: {
      statement: "Previous match state remains active.",
      evidenceIds: [
        "runtime:cleanup",
        "static:cleanup",
        "observation:" + label,
      ],
    },
    classificationEvidence: {
      impactEvidenceIds: [
        "observation:" + label,
      ],
      primaryFailureEvidenceIds:
        options.expectedEvidenceIds ??
        ["intent:evidence"],
    },
    ...(options.reproduction === undefined
      ? {}
      : { reproduction: options.reproduction }),
    ...(options.ai
      ? {
          aiAnalysis: "Cleanup does not clear the owned state.",
          sourceEvidence: [{
            source: {
              artifactId: "map",
              relativePath: "scripts/session.ts",
              range: {
                lineStart: 10,
                lineEnd: 12,
              },
            },
            reason: "Owns match cleanup.",
          }],
        }
      : {}),
    brokenInvariantIds: ["inv:cleanup"],
    repairUnitIds: ["unit:session-cleanup"],
  };
}

describe("report defect collector", () => {
  it("collects canonical defects from all three evidence routes", () => {
    const result = collectConfirmedDefects([
      {
        route: "runtime",
        intent,
        assessment: runtimeAssessment,
        defect: defect("runtime-cleanup", { ai: true }),
      },
      {
        route: "static",
        intent,
        result: staticResult,
        defect: defect("static-cleanup", { ai: true }),
      },
      {
        route: "tester",
        subjectIds: ["outcome:cleanup"],
        confirmation: {
          expectedBehaviorAuthority: "explicit-requirement",
          expectedEvidenceIds: ["requirement:cleanup"],
          reproduced: true,
          evidence: "State persists after two repeated match completions.",
        },
        defect: defect("tester-cleanup", {
          expectedAuthority: "explicit-requirement",
          expectedEvidenceIds: ["requirement:cleanup"],
          reproduction: [
            "Complete a match.",
            "Return to lobby.",
            "Start another match.",
          ],
        }),
      },
    ]);

    expect(result.confirmed).toHaveLength(3);
    expect(result.rejected).toHaveLength(0);
    expect(
      result.confirmed.map((item) => item.foundBy),
    ).toEqual(["ai", "ai", "tester"]);
  });

  it("ignores caller-supplied AI broken invariant identity", () => {
    const attempted = {
      ...defect("attempted-identity", { ai: true }),
      brokenInvariantIds: ["inv:caller-controlled"],
    };

    const result = collectConfirmedDefects([{
      route: "static",
      intent,
      result: staticResult,
      defect: attempted,
    }]);

    expect(result.confirmed).toHaveLength(1);
    expect(result.confirmed[0]?.brokenInvariantIds)
      .toEqual(["inv:cleanup"]);
    expect(result.confirmed[0]?.semanticKey)
      .toContain("invariants=inv:cleanup");
    expect(result.confirmed[0]?.semanticKey)
      .not.toContain("caller-controlled");
  });

  it("derives severity category and ids during final projection", () => {
    const result = buildBugReportFromAuditCandidates({
      map: {
        name: "Beach Bedwars",
        mapVersion: "1.0.4",
        baseVersion: "1.26.20",
        testedVersion: "1.26.32",
      },
      repairBy: "developer",
      files: [{
        relativePath: "scripts/session.ts",
        size: 1,
      }],
      candidates: [{
        route: "tester",
        subjectIds: ["outcome:cleanup"],
        confirmation: {
          expectedBehaviorAuthority: "explicit-requirement",
          expectedEvidenceIds: ["requirement:cleanup"],
          reproduced: true,
          evidence: "State persists after repeated completion.",
        },
        defect: defect("cleanup", {
          expectedAuthority: "explicit-requirement",
          expectedEvidenceIds: ["requirement:cleanup"],
          reproduction: [
            "Complete a match.",
            "Observe retained state.",
          ],
        }),
      }],
    });

    expect(result.promotion.ok).toBe(true);
    if (!result.promotion.ok) return;
    expect(result.promotion.report.bugs[0]).toEqual(
      expect.objectContaining({
        id: expect.stringMatching(/^BUG-BB-[A-Z0-9]+$/),
        severity: "major",
        category: "player-state",
        foundBy: "tester",
      }),
    );
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
      files: [{
        relativePath: "scripts/session.ts",
        size: 1,
      }],
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
          defect: defect("rejected", { ai: true }),
        },
        {
          route: "tester",
          subjectIds: ["outcome:cleanup"],
          confirmation: {
            expectedBehaviorAuthority: "explicit-requirement",
            expectedEvidenceIds: ["requirement:cleanup"],
            reproduced: true,
            evidence: "The state persists after repeated completion.",
          },
          defect: defect("accepted", {
            expectedAuthority: "explicit-requirement",
            expectedEvidenceIds: ["requirement:cleanup"],
            reproduction: [
              "Complete a match.",
              "Observe retained state.",
            ],
          }),
        },
      ],
    });

    expect(result.collection.confirmed).toHaveLength(1);
    expect(result.collection.rejected).toEqual([
      expect.objectContaining({
        route: "runtime",
        semanticKey: expect.stringContaining(
          "subjects=outcome:cleanup",
        ),
      }),
    ]);
    expect(result.promotion.ok).toBe(true);
    if (!result.promotion.ok) return;
    expect(result.promotion.report.bugs).toHaveLength(1);
  });

  it("exposes targeted next evidence for rejected candidates", () => {
    const result = collectConfirmedDefects([
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
        defect: defect("needs-authored-intent", { ai: true }),
      },
      {
        route: "tester",
        subjectIds: ["outcome:cleanup"],
        confirmation: {
          expectedBehaviorAuthority: "explicit-requirement",
          expectedEvidenceIds: ["requirement:cleanup"],
          reproduced: false,
          evidence: "Observed once.",
        },
        defect: defect("needs-reproduction", {
          expectedAuthority: "explicit-requirement",
          expectedEvidenceIds: ["requirement:cleanup"],
          reproduction: ["Attempt reproduction."],
        }),
      },
    ]);

    expect(result.rejected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          route: "runtime",
          semanticKey: expect.stringContaining(
            "subjects=outcome:cleanup",
          ),
          nextEvidenceNeed: "authored-intent",
          evidenceIds: expect.arrayContaining([
            "runtime:cleanup",
          ]),
        }),
        expect.objectContaining({
          route: "tester",
          semanticKey: expect.stringContaining(
            "subjects=outcome:cleanup",
          ),
          nextEvidenceNeed: "tester-reproduction",
          evidenceIds: expect.arrayContaining([
            "requirement:cleanup",
          ]),
        }),
      ]),
    );
  });

  it("rejects classification evidence outside the defect evidence universe", () => {
    const result = collectConfirmedDefects([{
      route: "static",
      intent,
      result: staticResult,
      defect: {
        ...defect("bad-classification", { ai: true }),
        classificationEvidence: {
          impactEvidenceIds: ["unrelated:impact"],
          primaryFailureEvidenceIds: ["intent:evidence"],
        },
      },
    }]);

    expect(result.confirmed).toHaveLength(0);
    expect(result.rejected[0]?.reasons.join(" "))
      .toMatch(/Classification evidence/);
  });

  it("rejects report facts that are not grounded in confirmation evidence", () => {
    const result = collectConfirmedDefects([{
      route: "static",
      intent,
      result: staticResult,
      defect: {
        ...defect("bad-provenance", { ai: true }),
        expected: {
          authority: "authored-intent",
          statement: "Match-owned state is reset.",
          evidenceIds: ["unrelated:intent"],
        },
      },
    }]);

    expect(result.confirmed).toHaveLength(0);
    expect(result.rejected[0]?.reasons.join(" "))
      .toMatch(/Expected evidence/);
  });

  it("rejects tester Expected facts not grounded in requirement evidence", () => {
    const result = collectConfirmedDefects([{
      route: "tester",
      subjectIds: ["outcome:cleanup"],
      confirmation: {
        expectedBehaviorAuthority: "explicit-requirement",
        expectedEvidenceIds: ["requirement:cleanup"],
        reproduced: true,
        evidence: "The state persists after repeated completion.",
      },
      defect: defect("tester-bad-expected", {
        expectedAuthority: "explicit-requirement",
        expectedEvidenceIds: ["requirement:other"],
        reproduction: ["Reproduce the mismatch."],
      }),
    }]);

    expect(result.confirmed).toHaveLength(0);
    expect(result.rejected[0]?.reasons.join(" "))
      .toMatch(/tester requirement evidence/);
  });

  it("blocks promotion when AI source evidence is not in the audited inventory", () => {
    const result = buildBugReportFromAuditCandidates({
      map: {
        name: "Map",
        mapVersion: "1.0.0",
        baseVersion: "1.26.20",
        testedVersion: "1.26.20",
      },
      repairBy: "developer",
      files: [],
      candidates: [{
        route: "static",
        intent,
        result: staticResult,
        defect: defect("missing-source", { ai: true }),
      }],
    });

    expect(result.promotion.ok).toBe(false);
    if (result.promotion.ok) return;
    expect(
      result.promotion.issues.map((issue) => issue.code),
    ).toContain("invalid-confirmed-defect");
  });

  it("auto-binds a unique Semantic IR execution owner", () => {
    const semanticIr = {
      schemaVersion: 1 as const,
      execution: {
        regions: [{
          id: "exec:cleanup",
          kind: "script-function" as const,
          ownerId: "scripts/session",
          label: "function:cleanup",
          source: {
            artifactId: "map",
            relativePath: "scripts/session.ts",
            range: {
              lineStart: 1,
              lineEnd: 30,
            },
          },
        }],
        edges: [],
      },
      state: {
        surfaces: [],
        operations: [],
        authorityBindings: [],
      },
      temporal: {
        relations: [],
      },
    };

    const result = collectConfirmedDefects([{
      route: "static",
      intent,
      result: staticResult,
      semanticIr,
      defect: defect("auto-owner", { ai: true }),
    }]);

    expect(result.confirmed).toHaveLength(1);
    expect(result.confirmed[0]?.sourceEvidence?.[0]?.semanticOwnerId)
      .toBe("exec:cleanup");
    expect(result.confirmed[0]?.repairUnitIds).toEqual([
      "execution-region:exec:cleanup",
    ]);
  });

  it("accepts a source semantic owner proven by Semantic IR", () => {
    const semanticIr = {
      schemaVersion: 1 as const,
      execution: {
        regions: [{
          id: "exec:cleanup",
          kind: "script-function" as const,
          ownerId: "scripts/session",
          label: "function:cleanup",
          source: {
            artifactId: "map",
            relativePath: "scripts/session.ts",
            range: {
              lineStart: 10,
              lineEnd: 12,
            },
          },
        }],
        edges: [],
      },
      state: {
        surfaces: [],
        operations: [],
        authorityBindings: [],
      },
      temporal: {
        relations: [],
      },
    };

    const result = collectConfirmedDefects([{
      route: "static",
      intent,
      result: staticResult,
      semanticIr,
      defect: {
        ...defect("semantic-owner", { ai: true }),
        sourceEvidence: [{
          source: {
            artifactId: "map",
            relativePath: "scripts/session.ts",
            range: {
              lineStart: 10,
              lineEnd: 12,
            },
          },
          semanticOwnerId: "exec:cleanup",
          reason: "Owns cleanup.",
        }],
      },
    }]);

    expect(result.confirmed).toHaveLength(1);
    expect(result.confirmed[0]?.repairUnitIds).toEqual([
      "execution-region:exec:cleanup",
    ]);
  });

  it("rejects an unproven source semantic owner", () => {
    const result = collectConfirmedDefects([{
      route: "static",
      intent,
      result: staticResult,
      semanticIr: {
        schemaVersion: 1,
        execution: {
          regions: [],
          edges: [],
        },
        state: {
          surfaces: [],
          operations: [],
          authorityBindings: [],
        },
        temporal: {
          relations: [],
        },
      },
      defect: {
        ...defect("bad-owner", { ai: true }),
        sourceEvidence: [{
          source: {
            artifactId: "map",
            relativePath: "scripts/session.ts",
            range: {
              lineStart: 10,
              lineEnd: 12,
            },
          },
          semanticOwnerId: "exec:missing",
          reason: "Claimed owner.",
        }],
      },
    }]);

    expect(result.confirmed).toHaveLength(0);
    expect(result.rejected[0]?.reasons.join(" "))
      .toMatch(/not present in Semantic IR/);
  });

  it("rejects Suggested Fix without a repair decision", () => {
    const result = collectConfirmedDefects([{
      route: "static",
      intent,
      result: staticResult,
      defect: {
        ...defect("repair-advice", { ai: true }),
        suggestedFix: "Rewrite cleanup ownership.",
      },
    }]);

    expect(result.confirmed).toHaveLength(0);
    expect(result.rejected[0]).toEqual(
      expect.objectContaining({
        semanticKey: expect.stringContaining(
          "subjects=outcome:cleanup",
        ),
        reasons: [
          "Suggested Fix requires a diagnostic repair decision.",
        ],
        nextEvidenceNeed: "repair-decision",
      }),
    );
  });

  it("resolves multi-symptom groups through the high-level audit entry point", () => {
    const first = {
      route: "tester" as const,
      subjectIds: ["subject:a"],
      confirmation: {
        expectedBehaviorAuthority: "explicit-requirement" as const,
        expectedEvidenceIds: ["requirement:cleanup"],
        reproduced: true,
        evidence: "Symptom A is reproducible.",
      },
      defect: {
        ...defect("a", {
          ai: true,
          expectedAuthority: "explicit-requirement",
          expectedEvidenceIds: ["requirement:cleanup"],
          reproduction: ["Reproduce A."],
        }),
        causalIncidentId: "incident:cleanup",
      },
    };
    const second = {
      route: "tester" as const,
      subjectIds: ["subject:b"],
      confirmation: {
        expectedBehaviorAuthority: "explicit-requirement" as const,
        expectedEvidenceIds: ["requirement:cleanup"],
        reproduced: true,
        evidence: "Symptom B is reproducible.",
      },
      defect: {
        ...defect("b", {
          ai: true,
          expectedAuthority: "explicit-requirement",
          expectedEvidenceIds: ["requirement:cleanup"],
          reproduction: ["Reproduce B."],
        }),
        causalIncidentId: "incident:cleanup",
      },
    };

    const preview = collectConfirmedDefects([
      first,
      second,
    ]);
    const groupKey = groupConfirmedDefects(
      preview.confirmed,
    )[0]!.key;

    const result = buildBugReportFromAuditCandidates({
      map: {
        name: "Beach Bedwars",
        mapVersion: "1.0.4",
        baseVersion: "1.26.20",
        testedVersion: "1.26.20",
      },
      repairBy: "developer",
      files: [{
        relativePath: "scripts/session.ts",
        size: 1,
      }],
      candidates: [first, second],
      groupResolutions: [{
        groupKey,
        narrative: {
          title: "Cleanup retains match state",
          problem: "Multiple state symptoms share one cleanup defect.",
          expected: {
            statement: "Cleanup resets all match-owned state.",
          },
          observed: {
            statement: "Multiple state surfaces remain active.",
          },
          expectedAuthority: "explicit-requirement",
          foundBy: "tester",
          primaryFailure: "player-owned-state",
          reproduction: [
            "Complete a match.",
            "Return to lobby.",
            "Observe retained state.",
          ],
        },
      }],
    });

    expect(result.promotion.ok).toBe(true);
    if (!result.promotion.ok) return;
    expect(result.promotion.report.bugs).toHaveLength(1);
  });

  it("allocates the same ids regardless of candidate order", () => {
    const makeCandidates = (reversed: boolean) => {
      const entries = [
        {
          route: "tester" as const,
          subjectIds: ["outcome:a"],
          confirmation: {
            expectedBehaviorAuthority: "explicit-requirement" as const,
            expectedEvidenceIds: ["requirement:cleanup"],
            reproduced: true,
            evidence: "A",
          },
          defect: defect("a", {
            expectedAuthority: "explicit-requirement",
            expectedEvidenceIds: ["requirement:cleanup"],
            reproduction: ["A"],
          }),
        },
        {
          route: "tester" as const,
          subjectIds: ["outcome:b"],
          confirmation: {
            expectedBehaviorAuthority: "explicit-requirement" as const,
            expectedEvidenceIds: ["requirement:cleanup"],
            reproduced: true,
            evidence: "B",
          },
          defect: defect("b", {
            expectedAuthority: "explicit-requirement",
            expectedEvidenceIds: ["requirement:cleanup"],
            reproduction: ["B"],
          }),
        },
      ];
      return reversed ? [...entries].reverse() : entries;
    };

    const input = {
      map: {
        name: "Beach Bedwars",
        mapVersion: "1.0.4",
        baseVersion: "1.26.20",
        testedVersion: "1.26.20",
      },
      repairBy: "developer" as const,
      files: [{
        relativePath: "scripts/session.ts",
        size: 1,
      }],
    };

    const first = buildBugReportFromAuditCandidates({
      ...input,
      candidates: makeCandidates(false),
    });
    const second = buildBugReportFromAuditCandidates({
      ...input,
      candidates: makeCandidates(true),
    });

    expect(first.promotion.ok).toBe(true);
    expect(second.promotion.ok).toBe(true);
    if (!first.promotion.ok || !second.promotion.ok) return;

    const firstByTitle = [...first.promotion.report.bugs]
      .map((item) => item.id)
      .sort();
    const secondByTitle = [...second.promotion.report.bugs]
      .map((item) => item.id)
      .sort();
    expect(firstByTitle).toEqual(secondByTitle);
  });
});
