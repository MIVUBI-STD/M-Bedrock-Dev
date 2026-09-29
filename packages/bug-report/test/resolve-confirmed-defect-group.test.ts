import {
  describe,
  expect,
  it,
} from "vitest";
import type {
  ConfirmedDefect,
} from "../src/index.js";
import {
  groupConfirmedDefects,
  resolveConfirmedDefectGroup,
} from "../src/index.js";

function defect(
  semanticKey: string,
  overrides: Partial<ConfirmedDefect> = {},
): ConfirmedDefect {
  return {
    semanticKey,
    foundBy: "tester",
    confirmation: {
      basis: "tester-reproduction",
      evidence: "Reproduced symptom " + semanticKey,
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
    title: "Symptom " + semanticKey,
    problem: "Symptom problem " + semanticKey,
    expected: {
      authority: "explicit-requirement",
      statement: "Cleanup resets state.",
      evidenceIds: ["req:cleanup"],
    },
    observed: {
      statement: "State remains.",
      evidenceIds: ["obs:" + semanticKey],
    },
    reproduction: ["Step " + semanticKey],
    brokenInvariantIds: ["inv:cleanup"],
    repairUnitIds: ["unit:cleanup"],
    causalIncidentId: "incident:cleanup",
    ...overrides,
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
        semanticKey: "cleanup-state-not-reset",
        title: "Cleanup does not reset match state",
        problem: "Multiple match-owned state surfaces remain after cleanup.",
        expected: {
          statement: "All match-owned state is reset after cleanup.",
        },
        observed: {
          statement: "Inventory and scoreboard state persist after cleanup.",
        },
        primaryFailure: "player-owned-state",
      },
    );

    expect(resolved.semanticKey).toBe(
      "cleanup-state-not-reset",
    );
    expect(resolved.impact.progression).toBe("blocked");
    expect(resolved.expected.evidenceIds).toEqual([
      "req:cleanup",
    ]);
    expect(resolved.observed.evidenceIds).toEqual([
      "obs:inventory",
      "obs:scoreboard",
    ]);
    expect(resolved.reproduction).toEqual([
      "Step inventory",
      "Step scoreboard",
    ]);
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
          semanticKey: "merged",
          title: "Merged",
          problem: "Merged",
          expected: { statement: "Expected" },
          observed: { statement: "Observed" },
          primaryFailure: "player-owned-state",
        },
      )
    ).toThrow(/semantically incompatible/);
  });
});
