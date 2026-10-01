import {
  describe,
  expect,
  it,
} from "vitest";
import type {
  ConfirmedDefect,
} from "../src/index.js";
import {
  deriveConfirmedDefectSemanticKey,
  groupConfirmedDefects,
  resolveConfirmedDefectGroup,
} from "../src/index.js";

function defect(
  subject: string,
  overrides: Partial<Omit<
    ConfirmedDefect,
    "semanticKey"
  >> = {},
): ConfirmedDefect {
  const base: Omit<
    ConfirmedDefect,
    "semanticKey"
  > = {
    subjectIds: ["subject:" + subject],
    foundBy: "tester",
    confirmation: {
      basis: "tester-reproduction",
      evidence: "Reproduced symptom " + subject,
    },
    impact: {
      progression: "degraded",
      recovery: "normal",
      stability: "stable",
      coreMechanic: "correct",
      importantState: "materially-wrong",
      fairness: "unaffected",
    },
    primaryFailure: "player-owned-state",
    title: "Symptom " + subject,
    problem: "Symptom problem " + subject,
    expected: {
      authority: "explicit-requirement",
      statement: "Cleanup resets state.",
      evidenceIds: ["req:cleanup"],
    },
    observed: {
      statement: "State remains.",
      evidenceIds: ["obs:" + subject],
    },
    reproduction: [
      "Enter the cleanup scenario for " + subject + ".",
      "Complete the match and return to the lobby.",
      "Confirm the affected state remains after cleanup.",
    ],
    brokenInvariantIds: ["inv:cleanup"],
    repairUnitIds: ["unit:cleanup"],
    causalIncidentId: "incident:cleanup",
  };
  const merged = {
    ...base,
    ...overrides,
  };
  return {
    ...merged,
    semanticKey:
      deriveConfirmedDefectSemanticKey(merged),
  };
}

describe("canonical defect group resolution", () => {
  it("requires explicit canonical narrative while merging semantic evidence", () => {
    const group = groupConfirmedDefects([
      defect("inventory"),
      defect("scoreboard", {
        impact: {
          progression: "blocked",
          recovery: "normal",
          stability: "stable",
          coreMechanic: "materially-wrong",
          importantState: "materially-wrong",
          fairness: "unaffected",
        },
      }),
    ])[0]!;

    const resolved = resolveConfirmedDefectGroup(
      group,
      {
        title: "Cleanup does not reset match state",
        problem: "Multiple match-owned state surfaces remain after cleanup.",
        expected: {
          statement: "All match-owned state is reset after cleanup.",
        },
        observed: {
          statement: "Inventory and scoreboard state persist after cleanup.",
        },
        expectedAuthority: "explicit-requirement",
        primaryFailure: "player-owned-state",
        reproduction: [
          "Complete a match.",
          "Return to lobby.",
          "Start another match and observe retained state.",
        ],
      },
    );

    expect(resolved.semanticKey).toBe(
      deriveConfirmedDefectSemanticKey(resolved),
    );
    expect(resolved.subjectIds).toEqual([
      "subject:inventory",
      "subject:scoreboard",
    ]);
    expect(resolved.impact.progression).toBe("blocked");
    expect(resolved.expected.evidenceIds).toEqual([
      "req:cleanup",
    ]);
    expect(resolved.observed.evidenceIds).toEqual([
      "obs:inventory",
      "obs:scoreboard",
    ]);
    expect(resolved.reproduction).toEqual([
      "Complete a match.",
      "Return to lobby.",
      "Start another match and observe retained state.",
    ]);
  });

  it("requires explicit primary source selection when a group has more than three locations", () => {
    const withSource = (key: string, file: string): ConfirmedDefect =>
      defect(key, {
        foundBy: "ai",
        confirmation: {
          basis: "authored-contract-violation",
          evidence: "Static contradiction " + key,
        },
        sourceEvidence: [{
          source: {
            artifactId: "map",
            relativePath: file,
          },
          reason: "Primary location " + key,
        }],
      });

    const group = groupConfirmedDefects([
      withSource("a", "scripts/a.ts"),
      withSource("b", "scripts/b.ts"),
      withSource("c", "scripts/c.ts"),
      withSource("d", "scripts/d.ts"),
    ])[0]!;

    expect(() =>
      resolveConfirmedDefectGroup(
        group,
        {
          title: "Merged defect",
          problem: "Merged problem",
          expected: { statement: "Expected" },
          observed: { statement: "Observed" },
          expectedAuthority: "explicit-requirement",
          primaryFailure: "player-owned-state",
          aiAnalysis: "Merged analysis",
        },
      )
    ).toThrow(/select primary sourceEvidence explicitly/);
  });

  it("requires explicit discovery origin for mixed AI and tester groups", () => {
    const group = groupConfirmedDefects([
      defect("tester"),
      defect("ai", {
        foundBy: "ai",
        confirmation: {
          basis: "authored-contract-violation",
          evidence: "Static contradiction.",
        },
        aiAnalysis: "Static analysis.",
        sourceEvidence: [{
          source: {
            artifactId: "map",
            relativePath: "scripts/session.ts",
          },
          reason: "Owns cleanup.",
        }],
      }),
    ])[0]!;

    expect(() =>
      resolveConfirmedDefectGroup(
        group,
        {
          title: "Merged defect",
          problem: "Merged problem",
          expected: { statement: "Expected" },
          observed: { statement: "Observed" },
          expectedAuthority: "explicit-requirement",
          primaryFailure: "player-owned-state",
          reproduction: [
          "Complete a match and return to the lobby.",
          "Confirm the affected match state remains after cleanup.",
        ],
        },
      )
    ).toThrow(/explicit foundBy/);

    const resolved = resolveConfirmedDefectGroup(
      group,
      {
        title: "Merged defect",
        problem: "Merged problem",
        expected: { statement: "Expected" },
        observed: { statement: "Observed" },
        expectedAuthority: "explicit-requirement",
        foundBy: "tester",
        primaryFailure: "player-owned-state",
        reproduction: [
          "Complete a match and return to the lobby.",
          "Confirm the affected match state remains after cleanup.",
        ],
      },
    );

    expect(resolved.foundBy).toBe("tester");
  });

  it("uses Expected evidence only from the selected authority", () => {
    const group = groupConfirmedDefects([
      defect("requirement", {
        expected: {
          authority: "explicit-requirement",
          statement: "Cleanup resets state.",
          evidenceIds: ["req:cleanup"],
        },
      }),
      defect("runtime-contract", {
        expected: {
          authority: "runtime-contract",
          statement: "Cleanup resets runtime state.",
          evidenceIds: ["runtime-contract:cleanup"],
        },
      }),
    ])[0]!;

    const resolved = resolveConfirmedDefectGroup(
      group,
      {
        title: "Merged defect",
        problem: "Merged problem",
        expected: { statement: "Cleanup resets state." },
        observed: { statement: "State remains." },
        expectedAuthority: "explicit-requirement",
        primaryFailure: "player-owned-state",
        reproduction: [
          "Complete a match and return to the lobby.",
          "Confirm the affected match state remains after cleanup.",
        ],
      },
    );

    expect(resolved.expected.evidenceIds).toEqual([
      "req:cleanup",
    ]);
  });

  it("refuses groups with multiple primary failures", () => {
    const group = groupConfirmedDefects([
      defect("a"),
      defect("b", {
        primaryFailure: "session-concurrency",
      }),
    ])[0]!;

    expect(() =>
      resolveConfirmedDefectGroup(
        group,
        {
          title: "Merged defect",
          problem: "Merged problem",
          expected: { statement: "Expected" },
          observed: { statement: "Observed" },
          expectedAuthority: "explicit-requirement",
          primaryFailure: "player-owned-state",
          reproduction: [
          "Complete a match and return to the lobby.",
          "Confirm the affected match state remains after cleanup.",
        ],
        },
      )
    ).toThrow(/multiple primary failures/);
  });

  it("does not invent Suggested Fix during group resolution", () => {
    const group = groupConfirmedDefects([
      defect("a"),
      defect("b"),
    ])[0]!;

    const resolved = resolveConfirmedDefectGroup(
      group,
      {
        title: "Merged defect",
        problem: "Merged problem",
        expected: { statement: "Expected" },
        observed: { statement: "Observed" },
        expectedAuthority: "explicit-requirement",
        primaryFailure: "player-owned-state",
        reproduction: [
          "Complete a match and return to the lobby.",
          "Start the next match.",
          "Confirm the merged match-owned state remains from the previous match.",
        ],
      },
    );

    expect(resolved.suggestedFix).toBeUndefined();
  });

  it("does not carry Suggested Fix unless every symptom shares the same advice", () => {
    const group = groupConfirmedDefects([
      defect("a", {
        suggestedFix: "Reset state.",
      }),
      defect("b"),
    ])[0]!;

    const resolved = resolveConfirmedDefectGroup(
      group,
      {
        title: "Merged defect",
        problem: "Merged problem",
        expected: { statement: "Expected" },
        observed: { statement: "Observed" },
        expectedAuthority: "explicit-requirement",
        primaryFailure: "player-owned-state",
        reproduction: [
          "Complete a match and return to the lobby.",
          "Confirm the affected match state remains after cleanup.",
        ],
      },
    );

    expect(resolved.suggestedFix).toBeUndefined();
  });

  it("refuses incompatible defects even when caller constructs a group manually", () => {
    const group = {
      key: "manual",
      defects: [
        defect("a"),
        defect("b", {
          repairUnitIds: ["unit:other"],
        }),
      ],
    };

    expect(() =>
      resolveConfirmedDefectGroup(
        group,
        {
          title: "Merged",
          problem: "Merged",
          expected: { statement: "Expected" },
          observed: { statement: "Observed" },
          expectedAuthority: "explicit-requirement",
          primaryFailure: "player-owned-state",
          reproduction: [
          "Complete a match and return to the lobby.",
          "Confirm the affected match state remains after cleanup.",
        ],
        },
      )
    ).toThrow(/semantically incompatible/);
  });
});
