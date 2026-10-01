import { describe, expect, it } from "vitest";
import type {
  GameplayIntentModel,
} from "../../../gameplay-intent/src/index.js";
import {
  confirmGameplayIntentRuntimeDefectForReport,
} from "../../src/reporting/report-confirmation-adapter.js";
import type {
  GameplayIntentRuntimeAssessment,
} from "../../src/gameplay-intent-runtime-stage.js";

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
      statement: "Cleanup requires pending cleanup state.",
      strength: "must",
      status: "authored",
      subjectIds: ["outcome:cleanup"],
      evidenceIds: ["intent:evidence"],
    }],
    unknowns: [],
  };
}

function assessment(): GameplayIntentRuntimeAssessment {
  return {
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
      reasons: ["Selected-artifact contract contradiction."],
    },
    observationNeeds: [],
  };
}

describe("runtime report confirmation adapter", () => {
  it("confirms runtime contradiction against selected-artifact contract evidence", () => {
    expect(
      confirmGameplayIntentRuntimeDefectForReport(
        intent(),
        assessment(),
      ).confirmed,
    ).toBe(true);
  });

  it("rejects external/reference intent even when runtime contradiction exists", () => {
    expect(
      confirmGameplayIntentRuntimeDefectForReport(
        intent("external-reference"),
        assessment(),
      ).confirmed,
    ).toBe(false);
  });
});
