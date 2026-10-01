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
    origin: "source-code",
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
    "probable-defect",
    "designed-behavior",
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
});
