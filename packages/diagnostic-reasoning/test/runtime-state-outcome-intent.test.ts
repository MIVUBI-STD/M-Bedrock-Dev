import { describe, expect, it } from "vitest";
import {
  gateRuntimeStateOutcomeAgainstIntent,
} from "../src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import type {
  RuntimeStateSnapshot,
} from "../../project-model/src/index.js";

function model(): GameplayIntentModel {
  return {
    schemaVersion: 1,
    id: "reconnect-policy",
    evidence: [{
      id: "e:policy",
      origin: "source-code",
      locator: "src/recovery-policy.ts",
      summary: "Authored cleanup policy.",
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
            path: "record.pendingCleanup",
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
      statement: "Cleanup is admissible only under modeled guards.",
      strength: "must",
      status: "inferred",
      subjectIds: ["outcome:cleanup"],
      evidenceIds: ["e:policy"],
    }],
    unknowns: [],
  };
}

describe("runtime state outcome intent gate", () => {
  it("classifies policy-satisfied runtime state as designed behavior", () => {
    const snapshot: RuntimeStateSnapshot = {
      schemaVersion: 1,
      observations: [{
        path: "record.pendingCleanup",
        value: true,
        confidence: "observed",
        origin: "runtime-probe",
        evidenceId: "e:runtime-cleanup",
      }],
    };

    const result = gateRuntimeStateOutcomeAgainstIntent({
      intent: model(),
      outcomeId: "outcome:cleanup",
      stateSnapshot: snapshot,
      observationEvidenceIds: ["e:observed-outcome"],
    });

    expect(result.disposition).toBe("designed-behavior");
    expect(result.evidenceIds).toEqual([
      "e:observed-outcome",
      "e:runtime-cleanup",
    ]);
  });

  it("caps policy violation at probable defect", () => {
    const snapshot: RuntimeStateSnapshot = {
      schemaVersion: 1,
      observations: [{
        path: "record.pendingCleanup",
        value: false,
        confidence: "observed",
        origin: "runtime-probe",
        evidenceId: "e:runtime-cleanup",
      }],
    };

    expect(
      gateRuntimeStateOutcomeAgainstIntent({
        intent: model(),
        outcomeId: "outcome:cleanup",
        stateSnapshot: snapshot,
        observationEvidenceIds: ["e:observed-outcome"],
      }).disposition,
    ).toBe("probable-defect");
  });

  it("fails closed on conflicting runtime state", () => {
    const snapshot: RuntimeStateSnapshot = {
      schemaVersion: 1,
      observations: [
        {
          path: "record.pendingCleanup",
          value: true,
          confidence: "observed",
          origin: "runtime-probe",
          evidenceId: "e:a",
        },
        {
          path: "record.pendingCleanup",
          value: false,
          confidence: "observed",
          origin: "telemetry",
          evidenceId: "e:b",
        },
      ],
    };

    expect(
      gateRuntimeStateOutcomeAgainstIntent({
        intent: model(),
        outcomeId: "outcome:cleanup",
        stateSnapshot: snapshot,
        observationEvidenceIds: ["e:observed-outcome"],
      }).disposition,
    ).toBe("insufficient-evidence");
  });
});
