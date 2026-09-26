import type {
  CausalProof,
  RuntimeEvidenceRecord,
} from "../../project-model/src/index.js";
import {
  runtimeExperimentDefinitionRevision,
} from "./revision.js";
import {
  validateRuntimeExperimentDefinition,
  validateRuntimeExperimentTrial,
} from "./validate.js";
import type {
  RuntimeExperimentDefinition,
  RuntimeExperimentQualification,
  RuntimeExperimentTrial,
  RuntimeExperimentTrialOutcome,
} from "./types.js";

function evidenceId(
  trial: RuntimeExperimentTrial,
  index: number,
): string {
  return "experiment:" + trial.identity.experimentId +
    ":trial:" + trial.id + ":evidence:" + index;
}

function outcomeFor(
  trial: RuntimeExperimentTrial,
  predicateId: string,
): RuntimeExperimentTrialOutcome {
  const matching = trial.evidence
    .map((record, index) => ({ record, index }))
    .filter(({ record }) =>
      record.predicate === predicateId &&
      record.confidence === "observed"
    );

  const present = matching.filter(
    ({ record }) => record.state === "present",
  );
  const absent = matching.filter(
    ({ record }) => record.state === "absent",
  );

  const state =
    present.length > 0 && absent.length === 0
      ? "present"
      : absent.length > 0 && present.length === 0
        ? "absent"
        : "unknown";

  return {
    trialId: trial.id,
    armId: trial.identity.armId,
    runIndex: trial.identity.runIndex,
    predicateId,
    state,
    evidenceIds: matching.map(({ index }) => evidenceId(trial, index)),
  };
}

function consistentState(
  outcomes: readonly RuntimeExperimentTrialOutcome[],
): "present" | "absent" | undefined {
  if (outcomes.length === 0) return undefined;
  const states = new Set(outcomes.map((outcome) => outcome.state));
  if (states.size !== 1 || states.has("unknown")) return undefined;
  const only = outcomes[0]?.state;
  return only === "present" || only === "absent"
    ? only
    : undefined;
}

export function qualifyRuntimeExperiment(
  definition: RuntimeExperimentDefinition,
  trials: readonly RuntimeExperimentTrial[],
): RuntimeExperimentQualification {
  const definitionErrors =
    validateRuntimeExperimentDefinition(definition);
  const trialErrors = trials.flatMap((trial) =>
    validateRuntimeExperimentTrial(definition, trial)
  );
  if (definitionErrors.length > 0 || trialErrors.length > 0) {
    return {
      experimentId: definition.id,
      state: "insufficient",
      completedRunsByArm: {},
      unknownOutcomes: 0,
      controlTreatmentContrastPredicates: [],
      evidenceIds: [],
      reasons: [...definitionErrors, ...trialErrors],
    };
  }

  const trialKeys = new Set<string>();
  const duplicateTrialKeys = new Set<string>();
  for (const trial of trials) {
    const key =
      trial.identity.armId + "::" + trial.identity.runIndex;
    if (trialKeys.has(key)) duplicateTrialKeys.add(key);
    trialKeys.add(key);
  }
  if (duplicateTrialKeys.size > 0) {
    return {
      experimentId: definition.id,
      state: "insufficient",
      completedRunsByArm: {},
      unknownOutcomes: 0,
      controlTreatmentContrastPredicates: [],
      evidenceIds: [],
      reasons: [
        "Duplicate experiment arm/run identities: " +
          [...duplicateTrialKeys].sort().join(", ") +
          ".",
      ],
    };
  }

  const environmentFingerprints = new Set(
    trials.map((trial) => trial.identity.environmentFingerprint),
  );
  if (environmentFingerprints.size > 1) {
    return {
      experimentId: definition.id,
      state: "insufficient",
      completedRunsByArm: {},
      unknownOutcomes: 0,
      controlTreatmentContrastPredicates: [],
      evidenceIds: [],
      reasons: [
        "Control/treatment evidence spans multiple environment fingerprints.",
      ],
    };
  }

  const completed = trials.filter(
    (trial) => trial.status === "completed",
  );
  const completedRunsByArm: Record<string, number> = {};
  for (const trial of completed) {
    completedRunsByArm[trial.identity.armId] =
      (completedRunsByArm[trial.identity.armId] ?? 0) + 1;
  }

  const outcomes = completed.flatMap((trial) =>
    definition.outcomePredicateIds.map((predicateId) =>
      outcomeFor(trial, predicateId)
    )
  );
  const unknownOutcomes = outcomes.filter(
    (outcome) => outcome.state === "unknown",
  ).length;
  const evidenceIds = [
    ...new Set(outcomes.flatMap((outcome) => outcome.evidenceIds)),
  ].sort();

  const enoughRuns = definition.arms.every(
    (arm) =>
      (completedRunsByArm[arm.id] ?? 0) >=
        definition.minimumRunsPerArm,
  );
  if (!enoughRuns || unknownOutcomes > 0) {
    return {
      experimentId: definition.id,
      state: completed.length > 0 ? "observed" : "insufficient",
      completedRunsByArm,
      unknownOutcomes,
      controlTreatmentContrastPredicates: [],
      evidenceIds,
      reasons: [
        ...(enoughRuns
          ? []
          : ["Minimum completed runs per arm have not been reached."]),
        ...(unknownOutcomes > 0
          ? ["One or more experiment outcomes remain unknown."]
          : []),
      ],
    };
  }

  const allArmsRepeatable = definition.arms.every((arm) =>
    definition.outcomePredicateIds.every((predicateId) =>
      consistentState(
        outcomes.filter(
          (outcome) =>
            outcome.armId === arm.id &&
            outcome.predicateId === predicateId,
        ),
      ) !== undefined
    )
  );

  if (!allArmsRepeatable) {
    return {
      experimentId: definition.id,
      state: "observed",
      completedRunsByArm,
      unknownOutcomes,
      controlTreatmentContrastPredicates: [],
      evidenceIds,
      reasons: [
        "Completed runs do not reproduce a single outcome state within every arm.",
      ],
    };
  }

  const controls = definition.arms.filter(
    (arm) => arm.role === "control",
  );
  const treatments = definition.arms.filter(
    (arm) => arm.role === "treatment",
  );
  const contrast = definition.outcomePredicateIds.filter(
    (predicateId) => {
      const controlStates = new Set(
        controls.map((arm) =>
          consistentState(outcomes.filter(
            (outcome) =>
              outcome.armId === arm.id &&
              outcome.predicateId === predicateId,
          ))
        ),
      );
      const treatmentStates = new Set(
        treatments.map((arm) =>
          consistentState(outcomes.filter(
            (outcome) =>
              outcome.armId === arm.id &&
              outcome.predicateId === predicateId,
          ))
        ),
      );
      return (
        controlStates.size === 1 &&
        treatmentStates.size === 1 &&
        [...controlStates][0] !== [...treatmentStates][0]
      );
    },
  );

  return {
    experimentId: definition.id,
    state:
      contrast.length > 0
        ? "intervention-supported"
        : "repeatable",
    completedRunsByArm,
    unknownOutcomes,
    controlTreatmentContrastPredicates: contrast,
    evidenceIds,
    reasons: contrast.length > 0
      ? [
          "Control and treatment arms are internally repeatable and show a deterministic outcome contrast.",
        ]
      : [
          "All experiment arms are internally repeatable, but no control/treatment outcome contrast is established.",
        ],
  };
}

export function targetBoundObservedEvidence(
  definition: RuntimeExperimentDefinition,
  trial: RuntimeExperimentTrial,
): RuntimeEvidenceRecord[] {
  return trial.evidence
    .filter((record) => record.confidence === "observed")
    .map((record) => ({
      ...record,
      targetProfileFingerprint:
        definition.targetProfileFingerprint,
      origin: "controlled-experiment" as const,
      provenanceKey: [
        "runtime-experiment",
        definition.id,
        runtimeExperimentDefinitionRevision(definition),
        trial.id,
        trial.identity.environmentFingerprint,
      ].join(":"),
      relatedNodeIds: [
        ...(record.relatedNodeIds ?? []),
        "runtime-experiment:" + definition.id,
        "runtime-experiment-trial:" + trial.id,
      ],
    }));
}

export function experimentQualificationCausalProof(
  qualification: RuntimeExperimentQualification,
): CausalProof {
  switch (qualification.state) {
    case "insufficient":
      return {
        state: "unknown",
        evidenceIds: qualification.evidenceIds,
        note: qualification.reasons.join(" "),
      };
    case "observed":
      return {
        state: "supported",
        evidenceIds: qualification.evidenceIds,
        note: qualification.reasons.join(" "),
      };
    case "repeatable":
      return {
        state: "reproduced",
        evidenceIds: qualification.evidenceIds,
        reproductionIds: [qualification.experimentId],
        note: qualification.reasons.join(" "),
      };
    case "intervention-supported":
      return {
        state: "intervention-supported",
        evidenceIds: qualification.evidenceIds,
        interventionIds: [qualification.experimentId],
        reproductionIds: [qualification.experimentId],
        note: qualification.reasons.join(" "),
      };
  }
}
