import { describe, expect, it } from "vitest";
import type {
  DiagnosticHypothesisSet,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  RuntimeEvidenceRecord,
} from "../../project-model/src/index.js";
import type {
  RuntimeExperimentQualification,
  RuntimeExperimentTrial,
} from "../../runtime-lab/src/index.js";
import {
  reassessHypothesesFromRuntimeExperiment,
  runtimeExperimentDiagnosticEvidence,
} from "../src/index.js";

function trial(
  id: string,
  armId: string,
  evidence: readonly RuntimeEvidenceRecord[],
): RuntimeExperimentTrial {
  return {
    schemaVersion: 1,
    id,
    identity: {
      experimentId: "exp",
      definitionRevision: "r1",
      armId,
      runIndex: 0,
      targetProfileFingerprint: "profile",
      fixtureFingerprint: "fixture",
      environmentFingerprint: "env",
    },
    status: "completed",
    evidence,
  };
}

const evidencePresent: RuntimeEvidenceRecord = {
  predicate: "cleanup-complete",
  state: "present",
  confidence: "observed",
  origin: "controlled-experiment",
  provenanceKey: "e:present",
};

const evidenceAbsent: RuntimeEvidenceRecord = {
  predicate: "cleanup-complete",
  state: "absent",
  confidence: "observed",
  origin: "controlled-experiment",
  provenanceKey: "e:absent",
};

describe("runtime experiment diagnostic evidence bridge", () => {
  it("keeps observed evidence at observed ceiling", () => {
    const qualification: RuntimeExperimentQualification = {
      experimentId: "exp",
      state: "observed",
      completedRunsByArm: { treatment: 1 },
      unknownOutcomes: 0,
      controlTreatmentContrastPredicates: [],
      evidenceIds: ["e:present"],
      reasons: [],
    };

    const bridge = runtimeExperimentDiagnosticEvidence(
      qualification,
      [trial("t1", "treatment", [evidencePresent])],
    );

    expect(bridge.predicates[0]?.ceiling).toBe(
      "observed",
    );
    expect(bridge.observations[0]?.state).toBe(
      "present",
    );
  });

  it("promotes only deterministic contrast predicates to intervention-supported", () => {
    const qualification: RuntimeExperimentQualification = {
      experimentId: "exp",
      state: "intervention-supported",
      completedRunsByArm: {
        control: 1,
        treatment: 1,
      },
      unknownOutcomes: 0,
      controlTreatmentContrastPredicates: [
        "cleanup-complete",
      ],
      evidenceIds: ["e:present", "e:absent"],
      reasons: [],
    };

    const bridge = runtimeExperimentDiagnosticEvidence(
      qualification,
      [
        trial("control", "control", [evidenceAbsent]),
        trial("treatment", "treatment", [evidencePresent]),
      ],
    );

    expect(bridge.predicates[0]?.ceiling).toBe(
      "intervention-supported",
    );
    expect(bridge.predicates[0]?.observation.state).toBe(
      "unknown",
    );
  });

  it("never hides conflicting trial observations behind a stronger ceiling", () => {
    const qualification: RuntimeExperimentQualification = {
      experimentId: "exp",
      state: "repeatable",
      completedRunsByArm: {
        control: 1,
        treatment: 1,
      },
      unknownOutcomes: 0,
      controlTreatmentContrastPredicates: [],
      evidenceIds: [],
      reasons: [],
    };

    const bridge = runtimeExperimentDiagnosticEvidence(
      qualification,
      [
        trial("a", "control", [evidencePresent]),
        trial("b", "treatment", [evidenceAbsent]),
      ],
    );

    expect(bridge.observations[0]?.state).toBe(
      "unknown",
    );
    expect(bridge.predicates[0]?.ceiling).toBe(
      "repeatable",
    );
  });

  it("reassesses diagnostic hypotheses using runtime observations", () => {
    const set: DiagnosticHypothesisSet = {
      schemaVersion: 1,
      id: "cleanup",
      hypotheses: [{
        id: "cleanup-runs",
        statement: "Cleanup completes.",
        requiredPredicates: [
          "cleanup-complete",
        ],
      }],
    };
    const qualification: RuntimeExperimentQualification = {
      experimentId: "exp",
      state: "observed",
      completedRunsByArm: { treatment: 1 },
      unknownOutcomes: 0,
      controlTreatmentContrastPredicates: [],
      evidenceIds: ["e:present"],
      reasons: [],
    };

    const result =
      reassessHypothesesFromRuntimeExperiment(
        set,
        qualification,
        [trial("t1", "treatment", [evidencePresent])],
      );

    expect(
      result.assessments[0]?.disposition,
    ).toBe("supported");
    expect(
      result.bridge.predicates[0]?.ceiling,
    ).toBe("observed");
  });
});
