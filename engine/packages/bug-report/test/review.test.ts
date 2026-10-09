import { describe, expect, it } from "vitest";
import {
  applyProposedBugReview,
  buildBugReportFromApprovedBugSet,
  deriveConfirmedDefectSemanticKey,
  projectProposedBugSet,
  type ConfirmedDefect,
} from "../src/index.js";

const map = {
  name: "Review Map",
  mapVersion: "1.0.0",
  drive: "https://drive.google.com/file/d/map/view",
  baseVersion: "1.26.20",
  testedVersion: "1.26.32",
};

function defect(
  subject: string,
  progression:
    | "blocked"
    | "degraded"
    | "unaffected" = "degraded",
): ConfirmedDefect {
  const base: Omit<ConfirmedDefect, "semanticKey"> = {
    subjectIds: ["subject:" + subject],
    foundBy: "ai",
    confirmation: {
      basis: "authored-contract-violation",
      evidence: "Current behavior contradicts approved gameplay.",
    },
    impact: {
      progression,
      recovery:
        progression === "blocked"
          ? "abnormal"
          : "normal",
      stability: "stable",
      coreMechanic:
        progression === "unaffected"
          ? "correct"
          : "materially-wrong",
      importantState: "correct",
      fairness: "unaffected",
    },
    primaryFailure: "game-progression",
    title: "Gameplay cannot continue normally",
    problem: "Players cannot continue the required gameplay path normally.",
    expected: {
      authority: "explicit-requirement",
      statement: "The required gameplay path remains completable.",
      evidenceIds: ["design:required-path"],
    },
    observed: {
      statement: "The required gameplay path becomes unavailable.",
      evidenceIds: ["static:path"],
    },
    reproduction: [
      "Start the affected gameplay.",
      "Complete the prerequisite action.",
      "Confirm the required next action is unavailable.",
    ],
    aiAnalysis:
      "The current flow contradicts the approved required path.",
    sourceEvidence: [{
      source: {
        artifactId: "map",
        relativePath: "scripts/gameplay.ts",
        range: {
          lineStart: 20,
          lineEnd: 24,
        },
      },
      reason: "Owns the required transition.",
    }],
    brokenInvariantIds: ["inv:required-path"],
    repairUnitIds: ["unit:gameplay"],
  };

  return {
    ...base,
    semanticKey:
      deriveConfirmedDefectSemanticKey(base),
  };
}

describe("proposed bug chat approval", () => {
  it("projects only blocker and major defects into the default proposed set", () => {
    const proposed = projectProposedBugSet(
      map,
      [
        defect("blocker", "blocked"),
        defect("major", "degraded"),
        defect("minor", "unaffected"),
      ],
    );

    expect(proposed.items).toHaveLength(2);
    expect(proposed.items.map((item) => item.severity))
      .toEqual(["blocker", "major"]);
  });

  it("blocks approval while any proposed bug lacks a review decision", () => {
    const proposed = projectProposedBugSet(
      map,
      [defect("a"), defect("b")],
    );

    const result = applyProposedBugReview(
      proposed,
      [{
        semanticKey: proposed.items[0]!.semanticKey,
        decision: "approve",
      }],
    );

    expect(result.ok).toBe(false);
  });

  it("blocks publication while an item still needs discussion", () => {
    const proposed = projectProposedBugSet(
      map,
      [defect("a")],
    );

    const result = applyProposedBugReview(
      proposed,
      [{
        semanticKey: proposed.items[0]!.semanticKey,
        decision: "needs-discussion",
        reason: "Need to confirm whether this behavior is intentional.",
      }],
    );

    expect(result.ok).toBe(false);
  });

  it("allows explicit rejection without publishing that bug", () => {
    const a = defect("a");
    const b = defect("b");
    const proposed = projectProposedBugSet(map, [a, b]);

    const reviewed = applyProposedBugReview(
      proposed,
      proposed.items.map((item, index) => ({
        semanticKey: item.semanticKey,
        decision:
          index === 0
            ? "approve" as const
            : "reject" as const,
        ...(index === 0
          ? {}
          : { reason: "Confirmed as intended game design." }),
      })),
    );

    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.approved.approvedSemanticKeys)
      .toHaveLength(1);
    expect(reviewed.approved.rejectedSemanticKeys)
      .toHaveLength(1);
  });

  it("builds canonical Bug Report V2 only from chat-approved defects", () => {
    const a = defect("a");
    const b = defect("b");
    const proposed = projectProposedBugSet(map, [a, b]);

    const reviewed = applyProposedBugReview(
      proposed,
      [
        {
          semanticKey: a.semanticKey,
          decision: "approve",
        },
        {
          semanticKey: b.semanticKey,
          decision: "reject",
          reason: "Confirmed as intended game design.",
        },
      ],
    );

    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;

    const report = buildBugReportFromApprovedBugSet({
      approved: reviewed.approved,
      repairBy: "developer",
      defects: [a, b],
    });

    expect(report.ok).toBe(true);
    if (!report.ok) return;
    expect(report.report.bugs).toHaveLength(1);
  });

  it("rejects fabricated approval state that does not match review decisions", () => {
    const a = defect("a");
    const proposed = projectProposedBugSet(map, [a]);
    const reviewed = applyProposedBugReview(
      proposed,
      [{
        semanticKey: a.semanticKey,
        decision: "approve",
      }],
    );

    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;

    const report = buildBugReportFromApprovedBugSet({
      approved: {
        ...reviewed.approved,
        approvedSemanticKeys: [],
      },
      repairBy: "developer",
      defects: [a],
    });

    expect(report.ok).toBe(false);
  });

  it("refuses artifact generation when chat review approves no bugs", () => {
    const a = defect("a");
    const proposed = projectProposedBugSet(map, [a]);
    const reviewed = applyProposedBugReview(
      proposed,
      [{
        semanticKey: a.semanticKey,
        decision: "reject",
        reason: "Designed behavior.",
      }],
    );

    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;

    const report = buildBugReportFromApprovedBugSet({
      approved: reviewed.approved,
      repairBy: "developer",
      defects: [a],
    });

    expect(report.ok).toBe(false);
  });

  it("rejects an approved set that loses a rejection reason", () => {
    const a = defect("a");
    const b = defect("b");
    const proposed = projectProposedBugSet(map, [a, b]);
    const reviewed = applyProposedBugReview(proposed, [
      { semanticKey: a.semanticKey, decision: "approve" },
      { semanticKey: b.semanticKey, decision: "reject", reason: "Intended behavior." },
    ]);
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;

    const forged = buildBugReportFromApprovedBugSet({
      approved: {
        ...reviewed.approved,
        decisions: reviewed.approved.decisions.map((item) =>
          item.semanticKey === b.semanticKey
            ? { semanticKey: item.semanticKey, decision: "reject" as const }
            : item
        ),
      },
      repairBy: "developer",
      defects: [a, b],
    });
    expect(forged.ok).toBe(false);
    if (forged.ok) return;
    expect(forged.issues.some((item) =>
      item.message.includes("Rejected approved-set decision requires a reason")
    )).toBe(true);
  });
});
