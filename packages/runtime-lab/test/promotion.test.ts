import { describe, expect, it } from "vitest";
import {
  experimentKnowledgeEvidence,
  type RuntimeExperimentDefinition,
} from "../src/index.js";

const definition: RuntimeExperimentDefinition = {
  schemaVersion: 1,
  id: "exp:knowledge",
  title: "Knowledge evidence fixture",
  domain: "compatibility",
  requiredContext: "LOCAL_MINECRAFT",
  mutationRisk: "read-only",
  targetProfileFingerprint: "profile-a",
  fixtureFingerprint: "fixture-a",
  protocol: [{
    id: "capture",
    phase: "observe",
    actionId: "runtime.capture",
  }],
  factors: [{ id: "version", description: "version" }],
  arms: [{
    id: "control",
    role: "control",
    factorValues: { version: 1 },
  }, {
    id: "treatment",
    role: "treatment",
    factorValues: { version: 2 },
  }],
  outcomePredicateIds: ["outcome"],
  minimumRunsPerArm: 2,
};

describe("runtime experiment knowledge evidence", () => {
  it("does not promote a single observed campaign", () => {
    expect(experimentKnowledgeEvidence(
      definition,
      {
        experimentId: definition.id,
        state: "observed",
        completedRunsByArm: { control: 1 },
        unknownOutcomes: 0,
        controlTreatmentContrastPredicates: [],
        evidenceIds: ["trial:a"],
        reasons: [],
      },
    )).toBeUndefined();
  });

  it("emits evidence metadata only after repeatability threshold", () => {
    expect(experimentKnowledgeEvidence(
      definition,
      {
        experimentId: definition.id,
        state: "intervention-supported",
        completedRunsByArm: {
          control: 2,
          treatment: 2,
        },
        unknownOutcomes: 0,
        controlTreatmentContrastPredicates: ["outcome"],
        evidenceIds: ["trial:a", "trial:b"],
        reasons: [],
      },
    )).toMatchObject({
      kind: "controlled-experiment",
      experimentId: definition.id,
      reproducibility: "repeatable",
      targetMatch: "exact",
    });
  });
});
