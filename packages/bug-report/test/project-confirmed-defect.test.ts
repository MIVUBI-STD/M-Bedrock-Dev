import {
  describe,
  expect,
  it,
} from "vitest";
import {
  allocateBugIds,
  buildBugReportFromConfirmedDefects,
  deriveConfirmedDefectSemanticKey,
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
    foundBy: "ai",
    confirmation: {
      basis: "authored-contract-violation",
      evidence:
        "Static implementation contradicts authored cleanup behavior.",
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
    aiAnalysis:
      "The cleanup path does not clear the owned state.",
    sourceEvidence: [{
      source: {
        artifactId: "map",
        relativePath: "scripts/session.ts",
        range: {
          lineStart: 10,
          lineEnd: 12,
        },
      },
      reason: "Owns cleanup state mutation.",
    }],
    brokenInvariantIds: ["inv:cleanup"],
    repairUnitIds: ["unit:session-cleanup"],
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

  it("allocates ids from deterministic semantic identity", () => {
    const a = defect("a-first");
    const z = defect("z-last");
    const ids = allocateBugIds(
      map.name,
      [z, a],
    );

    expect(ids.get(a.semanticKey))
      .toMatch(/^BUG-BB-[A-Z0-9]+$/);
    expect(ids.get(z.semanticKey))
      .toMatch(/^BUG-BB-[A-Z0-9]+$/);
    expect(ids.get(a.semanticKey))
      .not.toBe(ids.get(z.semanticKey));
  });

  it("keeps ids stable when input order changes", () => {
    const a = defect("a");
    const b = defect("b");
    const first = allocateBugIds(
      map.name,
      [a, b],
    );
    const second = allocateBugIds(
      map.name,
      [b, a],
    );

    expect([...first.entries()].sort()).toEqual(
      [...second.entries()].sort(),
    );
  });

  it("keeps an existing id stable when report contents grow", () => {
    const cleanup = defect("cleanup");
    const before = allocateBugIds(
      map.name,
      [cleanup],
    );
    const after = allocateBugIds(
      map.name,
      [
        defect("a-new-defect"),
        cleanup,
      ],
    );

    expect(after.get(cleanup.semanticKey)).toBe(
      before.get(cleanup.semanticKey),
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

  it("rejects a semantic key that does not match structured identity", () => {
    const item = defect("cleanup");
    const result = buildBugReportFromConfirmedDefects({
      map,
      repairBy: "developer",
      defects: [{
        ...item,
        semanticKey: "caller-controlled-key",
      }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.issues.map((issue) => issue.code),
    ).toContain("invalid-confirmed-defect");
  });

  it("projects a canonical V2 report", () => {
    const item = defect("cleanup");
    const expectedId = allocateBugIds(
      map.name,
      [item],
    ).get(item.semanticKey);

    const result = buildBugReportFromConfirmedDefects({
      map,
      repairBy: "developer",
      defects: [item],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.bugs[0]).toEqual(
      expect.objectContaining({
        id: expectedId,
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
