import {
  describe,
  expect,
  it,
} from "vitest";
import type {
  IntentDiagnosticGateResult,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  GameplayIntentModel,
} from "../../../gameplay-intent/src/index.js";
import {
  confirmStaticIntentDefectForReport,
} from "../../src/reporting/static-report-confirmation-adapter.js";

const intent: GameplayIntentModel = {
  schemaVersion: 1,
  id: "intent",
  evidence: [{
    id: "intent:evidence",
    origin: "game-design-spec",
    locator: "scripts/session.ts",
    summary: "Authored cleanup rule.",
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
    statement: "Cleanup must clear match-owned state.",
    strength: "must",
    status: "authored",
    subjectIds: ["outcome:cleanup"],
    evidenceIds: ["intent:evidence"],
  }],
  unknowns: [],
};

function result(
  disposition: IntentDiagnosticGateResult["disposition"],
): IntentDiagnosticGateResult {
  return {
    disposition,
    subjectIds: ["outcome:cleanup"],
    basisInvariantIds:
      disposition === "confirmed-defect"
        ? ["inv:cleanup"]
        : [],
    basisDesignRuleIds: [],
    basisDesignEvidenceIds: [],
    evidenceIds: ["static:contradiction"],
    nextEvidenceNeed:
      disposition === "confirmed-defect"
        ? "none"
        : "contradiction-proof",
    reasons: [
      disposition === "confirmed-defect"
        ? "Static evidence contradicts authored intent."
        : "The static evidence does not confirm a defect.",
    ],
  };
}

describe("static report confirmation adapter", () => {
  it("confirms an authored static contract violation", () => {
    const confirmation =
      confirmStaticIntentDefectForReport(
        intent,
        result("confirmed-defect"),
      );

    expect(confirmation.confirmed).toBe(true);
    if (!confirmation.confirmed) return;
    expect(confirmation.confirmation.basis).toBe(
      "authored-contract-violation",
    );
  });

  it.each([
        "designed-behavior",
    "design-review",
    "engine-constraint",
    "compatibility-difference",
    "insufficient-evidence",
    "ambiguous-intent",
    "runtime-proof-required",
  ] as const)(
    "does not promote %s static results",
    (disposition) => {
      const confirmation =
        confirmStaticIntentDefectForReport(
          intent,
          result(disposition),
        );

      expect(confirmation.confirmed).toBe(false);
    },
  );

  it("rejects source-code-only authored intent even when disposition says confirmed", () => {
    const confirmation =
      confirmStaticIntentDefectForReport(
        {
          ...intent,
          evidence: [{
            ...intent.evidence[0]!,
            origin: "source-code",
          }],
        },
        result("confirmed-defect"),
      );

    expect(confirmation.confirmed).toBe(false);
  });

  it("rejects inferred invariants even when disposition says confirmed", () => {
    const confirmation =
      confirmStaticIntentDefectForReport(
        {
          ...intent,
          invariants: [{
            ...intent.invariants[0]!,
            status: "inferred",
          }],
        },
        result("confirmed-defect"),
      );

    expect(confirmation.confirmed).toBe(false);
  });

  it("confirms an authoritative approved Game Design rule contradiction", () => {
    const confirmation =
      confirmStaticIntentDefectForReport(
        intent,
        {
          disposition: "confirmed-defect",
          subjectIds: ["combat:team-damage"],
          basisInvariantIds: [],
          basisDesignRuleIds: ["friendly-fire"],
          basisDesignEvidenceIds: [
            "game-design:offense:rule:friendly-fire",
          ],
          evidenceIds: ["static:friendly-fire-path"],
          nextEvidenceNeed: "none",
          reasons: [
            "Static behavior contradicts approved Game Design.",
          ],
        },
      );

    expect(confirmation.confirmed).toBe(true);
  });
});
