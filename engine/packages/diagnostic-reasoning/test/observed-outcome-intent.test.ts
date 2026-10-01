import { describe, expect, it } from "vitest";
import {
  gateObservedOutcomeAgainstIntent,
} from "../src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";

function policyModel(
  withUnknown = false,
): GameplayIntentModel {
  return {
    schemaVersion: 1,
    id: "reconnect-policy",
    artifactId: "artifact:reconnect",
    evidence: [{
      id: "e:policy",
      origin: "source-code",
      locator: "src/recovery-policy.ts",
      summary: "Direct guarded cleanup outcome.",
      scope: "selected-artifact",
    }],
    nodes: [
      {
        id: "outcome:cleanup",
        kind: "outcome",
        label: "Cleanup",
        status: "authored",
        evidenceIds: ["e:policy"],
      },
      {
        id: "policy:pending-cleanup",
        kind: "policy",
        label: "Pending Cleanup",
        status: "authored",
        evidenceIds: ["e:policy"],
        policyPredicate: {
          kind: "truthy",
          operand: {
            kind: "path",
            path: "state.pendingCleanup",
          },
        },
      },
    ],
    edges: [{
      id: "edge:cleanup-policy",
      from: "outcome:cleanup",
      to: "policy:pending-cleanup",
      kind: "requires",
      status: "authored",
      evidenceIds: ["e:policy"],
    }],
    invariants: [{
      id: "inv:admissible-policy:outcome:cleanup",
      statement: "Cleanup is statically observed only under pending cleanup.",
      strength: "must",
      status: "inferred",
      subjectIds: ["outcome:cleanup"],
      evidenceIds: ["e:policy"],
    }],
    unknowns: withUnknown
      ? [{
          id: "unknown:coverage",
          question: "Other cleanup branches are unresolved.",
          blockedSubjectIds: ["outcome:cleanup"],
        }]
      : [],
  };
}

describe("observed outcome intent gate", () => {
  it("classifies a policy-satisfied outcome as designed behavior", () => {
    expect(
      gateObservedOutcomeAgainstIntent({
        intent: policyModel(),
        outcomeId: "outcome:cleanup",
        stateValues: {
          state: {
            pendingCleanup: true,
          },
        },
        observationEvidenceIds: ["runtime:cleanup"],
      }).disposition,
    ).toBe("designed-behavior");
  });

  it("caps a policy-violating outcome at ambiguous outcome", () => {
    const result = gateObservedOutcomeAgainstIntent({
      intent: policyModel(),
      outcomeId: "outcome:cleanup",
      stateValues: {
        state: {
          pendingCleanup: false,
        },
      },
      observationEvidenceIds: ["runtime:cleanup"],
    });

    expect(result.disposition).toBe("ambiguous-intent");
    expect(result.basisInvariantIds).toEqual([
      "inv:admissible-policy:outcome:cleanup",
    ]);
  });

  it("preserves ambiguity when policy coverage is unresolved", () => {
    expect(
      gateObservedOutcomeAgainstIntent({
        intent: policyModel(true),
        outcomeId: "outcome:cleanup",
        stateValues: {
          state: {
            pendingCleanup: false,
          },
        },
        observationEvidenceIds: ["runtime:cleanup"],
      }).disposition,
    ).toBe("ambiguous-intent");
  });
});
