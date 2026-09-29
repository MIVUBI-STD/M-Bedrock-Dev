import {
  describe,
  expect,
  it,
} from "vitest";
import {
  allocateBugIds,
  buildBugReportFromConfirmedDefects,
  projectConfirmedDefects,
  type ConfirmedDefect,
} from "../src/index.js";

const map = {
  name: "Beach Bedwars",
  mapVersion: "1.0.4",
  baseVersion: "1.26.20",
  testedVersion: "1.26.32",
};

function defect(
  semanticKey: string,
  overrides: Partial<ConfirmedDefect> = {},
): ConfirmedDefect {
  return {
    semanticKey,
    foundBy: "ai",
    confirmation: {
      basis: "authored-contract-violation",
      evidence: "Static implementation contradicts authored cleanup behavior.",
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
    title: "Cleanup retains match state",
    problem: "Match-owned state remains after cleanup.",
    expected: {
      authority: "authored-intent",
      statement: "Match-owned state is reset after cleanup.",
      evidenceIds: ["intent:cleanup"],
    },
    observed: {
      statement: "Previous match state remains active.",
      evidenceIds: ["static:cleanup"],
    },
    aiAnalysis: "The cleanup path does not clear the owned state.",
    sourceEvidence: [{
      source: {
        artifactId: "map",
        relativePath: "scripts/session.ts",
      },
      reason: "Owns cleanup state mutation.",
    }],
    brokenInvariantIds: ["inv:cleanup"],
    repairUnitIds: ["unit:session-cleanup"],
    ...overrides,
  };
}

describe("confirmed defect projection", () => {
  it("derives severity and category instead of trusting caller labels", () => {
    const projected = projectConfirmedDefects(
      map,
      [defect("cleanup")],
    );

    expect(projected[0]).toEqual(
      expect.objectContaining({
        severity: "major",
        category: "player-state",
      }),
    );
  });

  it("allocates stable ids from semantic ordering", () => {
    const ids = allocateBugIds(
      map.name,
      [
        defect("z-last"),
        defect("a-first"),
      ],
    );

    expect(ids.get("a-first")).toBe("BUG-BB-1OTRUH3");
    expect(ids.get("z-last")).toBe("BUG-BB-0TOWYPC");
  });

  it("keeps ids stable when input order changes", () => {
    const first = allocateBugIds(
      map.name,
      [defect("a"), defect("b")],
    );
    const second = allocateBugIds(
      map.name,
      [defect("b"), defect("a")],
    );

    expect([...first.entries()]).toEqual(
      [...second.entries()],
    );
  });

  it("keeps an existing id stable when report contents grow", () => {
    const before = allocateBugIds(
      map.name,
      [defect("cleanup")],
    );
    const after = allocateBugIds(
      map.name,
      [
        defect("a-new-defect"),
        defect("cleanup"),
      ],
    );

    expect(after.get("cleanup")).toBe(
      before.get("cleanup"),
    );
  });

  it("blocks unresolved multi-symptom semantic groups", () => {
    const result = buildBugReportFromConfirmedDefects({
      map,
      repairBy: "developer",
      defects: [
        defect("symptom-a", {
          causalIncidentId: "incident:cleanup",
        }),
        defect("symptom-b", {
          causalIncidentId: "incident:cleanup",
        }),
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.issues.map((issue) => issue.code),
    ).toContain("unresolved-defect-group");
  });

  it("projects a canonical V2 report", () => {
    const result = buildBugReportFromConfirmedDefects({
      map,
      repairBy: "developer",
      defects: [defect("cleanup")],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.bugs[0]).toEqual(
      expect.objectContaining({
        id: "BUG-BB-1OB7ULV",
        severity: "major",
        category: "player-state",
        foundBy: "ai",
        relevantCode: [{
          file: "scripts/session.ts",
          reason: "Owns cleanup state mutation.",
        }],
      }),
    );
  });
});
