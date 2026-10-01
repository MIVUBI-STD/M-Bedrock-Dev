import {
  describe,
  expect,
  it,
} from "vitest";
import type {
  GameplayIntentModel,
} from "../../../gameplay-intent/src/index.js";
import {
  confirmGameplayIntentRuntimeDefectForReport,
} from "../../src/reporting/report-confirmation-adapter.js";
import type {
  GameplayIntentRuntimeAssessment,
} from "../../src/gameplay-intent-runtime-stage.js";

const intent: GameplayIntentModel = {
  schemaVersion: 1,
  id: "intent",
  evidence: [{
    id: "intent:evidence",
    origin: "game-design-spec",
    locator: "scripts/session.ts",
    summary: "Authored session cleanup rule.",
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
    statement: "Cleanup requires pending cleanup state.",
    strength: "must",
    status: "authored",
    subjectIds: ["outcome:cleanup"],
    evidenceIds: ["intent:evidence"],
  }],
  unknowns: [],
};

function assessment(
  disposition:
    GameplayIntentRuntimeAssessment["result"]["disposition"],
): GameplayIntentRuntimeAssessment {
  return {
    outcomeObservation: {
      outcomeId: "outcome:cleanup",
      evidenceId: "runtime:cleanup",
    },
    result: {
      disposition,
      subjectIds: ["outcome:cleanup"],
      basisInvariantIds:
        disposition === "confirmed-defect"
          ? ["inv:cleanup"]
          : [],
      evidenceIds: ["runtime:cleanup"],
      nextEvidenceNeed:
        disposition === "confirmed-defect"
          ? "none"
          : "authored-intent",
      reasons: [
        disposition === "confirmed-defect"
          ? "Observed evidence contradicts authored intent."
          : "Evidence is not sufficient for confirmation.",
      ],
    },
    observationNeeds: [],
  };
}

describe("report confirmation adapter", () => {
  it("promotes only runtime assessments already classified as confirmed defect", () => {
    const result =
      confirmGameplayIntentRuntimeDefectForReport(
        intent,
        assessment("confirmed-defect"),
      );

    expect(result.confirmed).toBe(true);
    if (!result.confirmed) return;
    expect(result.confirmation.basis).toBe(
      "runtime-observation",
    );
  });

  it.each([
        "designed-behavior",
    "compatibility-difference",
    "insufficient-evidence",
    "ambiguous-intent",
  ] as const)(
    "does not promote %s runtime assessments",
    (disposition) => {
      const result =
        confirmGameplayIntentRuntimeDefectForReport(
          intent,
          assessment(disposition),
        );

      expect(result.confirmed).toBe(false);
    },
  );

  it("rejects confirmed disposition without authored invariant evidence", () => {
    const result =
      confirmGameplayIntentRuntimeDefectForReport(
        {
          ...intent,
          invariants: [{
            ...intent.invariants[0]!,
            status: "inferred",
          }],
        },
        assessment("confirmed-defect"),
      );

    expect(result.confirmed).toBe(false);
  });  it("rejects source-code-only authored intent even when disposition says confirmed", () => {
    const confirmation =
      confirmGameplayIntentRuntimeDefectForReport(
        {
          ...intent,
          evidence: [{
            ...intent.evidence[0]!,
            origin: "source-code",
          }],
        },
        assessment("confirmed-defect"),
      );

    expect(confirmation.confirmed).toBe(false);
  });


});
