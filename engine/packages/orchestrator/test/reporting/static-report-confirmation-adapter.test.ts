import { describe, expect, it } from "vitest";
import type {
  IntentDiagnosticGateResult,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  GameplayIntentModel,
} from "../../../gameplay-intent/src/index.js";
import {
  confirmStaticIntentDefectForReport,
} from "../../src/reporting/static-report-confirmation-adapter.js";

function intent(
  scope: "selected-artifact" | "external-reference" =
    "selected-artifact",
): GameplayIntentModel {
  return {
    schemaVersion: 1,
    id: "intent",
    artifactId: "artifact:v1",
    evidence: [{
      id: "intent:evidence",
      origin: "source-code",
      locator: "behavior_packs/demo/scripts/session.js",
      summary: "Cleanup contract.",
      scope,
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
}

function result(): IntentDiagnosticGateResult {
  return {
    disposition: "confirmed-defect",
    subjectIds: ["outcome:cleanup"],
    basisInvariantIds: ["inv:cleanup"],
    basisDesignRuleIds: [],
    basisDesignEvidenceIds: [],
    evidenceIds: ["static:contradiction"],
    nextEvidenceNeed: "none",
    reasons: ["Selected-artifact contract contradiction."],
  };
}

describe("static report confirmation adapter", () => {
  it("confirms only selected-artifact contract violations", () => {
    expect(
      confirmStaticIntentDefectForReport(
        intent(),
        result(),
      ).confirmed,
    ).toBe(true);
  });

  it("rejects external/reference intent even when disposition says confirmed", () => {
    expect(
      confirmStaticIntentDefectForReport(
        intent("external-reference"),
        result(),
      ).confirmed,
    ).toBe(false);
  });

  it("rejects manually supplied external design evidence without selected-artifact invariant authority", () => {
    const confirmation =
      confirmStaticIntentDefectForReport(
        {
          ...intent(),
          invariants: [],
        },
        {
          ...result(),
          basisInvariantIds: [],
          basisDesignRuleIds: ["external-rule"],
          basisDesignEvidenceIds: ["external:design"],
        },
      );

    expect(confirmation.confirmed).toBe(false);
  });
});
