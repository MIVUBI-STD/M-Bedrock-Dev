import {
  assessDiagnosticHypotheses,
  type DiagnosticEvidenceObservation,
  type DiagnosticHypothesisSet,
  type HypothesisAssessment,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  RuntimeEvidenceRecord,
} from "../../project-model/src/index.js";
import type {
  RuntimeExperimentQualification,
  RuntimeExperimentTrial,
} from "../../runtime-lab/src/index.js";

export type RuntimeDiagnosticEvidenceCeiling =
  | "unknown"
  | "observed"
  | "repeatable"
  | "intervention-supported";

export interface RuntimeDiagnosticPredicateEvidence {
  predicate: string;
  observation: DiagnosticEvidenceObservation;
  ceiling: RuntimeDiagnosticEvidenceCeiling;
  sourceEvidenceIds: readonly string[];
}

export interface RuntimeExperimentDiagnosticBridge {
  experimentId: string;
  qualificationState: RuntimeExperimentQualification["state"];
  predicates: readonly RuntimeDiagnosticPredicateEvidence[];
  observations: readonly DiagnosticEvidenceObservation[];
}

function aggregateState(
  records: readonly RuntimeEvidenceRecord[],
): DiagnosticEvidenceObservation["state"] {
  const states = new Set(
    records
      .filter((record) => record.confidence === "observed")
      .map((record) => record.state),
  );
  if (states.size !== 1) return "unknown";
  const only = [...states][0];
  return only === "present" || only === "absent"
    ? only
    : "unknown";
}

function ceilingFor(
  predicate: string,
  qualification: RuntimeExperimentQualification,
): RuntimeDiagnosticEvidenceCeiling {
  switch (qualification.state) {
    case "insufficient":
      return "unknown";
    case "observed":
      return "observed";
    case "repeatable":
      return "repeatable";
    case "intervention-supported":
      return qualification.controlTreatmentContrastPredicates.includes(
        predicate,
      )
        ? "intervention-supported"
        : "repeatable";
  }
}

function evidenceIdsFor(
  experimentId: string,
  predicate: string,
  records: readonly RuntimeEvidenceRecord[],
): readonly string[] {
  return records.map((record, index) =>
    record.provenanceKey ??
    [
      "runtime-experiment",
      experimentId,
      predicate,
      String(record.observedAt?.tick ?? "na"),
      String(index),
    ].join(":")
  );
}

export function runtimeExperimentDiagnosticEvidence(
  qualification: RuntimeExperimentQualification,
  trials: readonly RuntimeExperimentTrial[],
): RuntimeExperimentDiagnosticBridge {
  const completed = trials.filter(
    (trial) => trial.status === "completed",
  );
  const byPredicate = new Map<
    string,
    RuntimeEvidenceRecord[]
  >();

  for (const trial of completed) {
    for (const record of trial.evidence) {
      const list = byPredicate.get(record.predicate) ?? [];
      list.push(record);
      byPredicate.set(record.predicate, list);
    }
  }

  const predicates = [...byPredicate.entries()]
    .map(([predicate, records]) => {
      const state = aggregateState(records);
      const ceiling = ceilingFor(
        predicate,
        qualification,
      );
      const sourceEvidenceIds = evidenceIdsFor(
        qualification.experimentId,
        predicate,
        records,
      );
      const observation: DiagnosticEvidenceObservation = {
        predicate,
        state,
        evidenceId: [
          "runtime-experiment",
          qualification.experimentId,
          predicate,
          ceiling,
          state,
        ].join(":"),
      };
      return {
        predicate,
        observation,
        ceiling,
        sourceEvidenceIds,
      };
    })
    .sort((a, b) =>
      a.predicate.localeCompare(b.predicate)
    );

  return {
    experimentId: qualification.experimentId,
    qualificationState: qualification.state,
    predicates,
    observations: predicates.map(
      (item) => item.observation,
    ),
  };
}

export interface RuntimeExperimentDiagnosticAssessment {
  bridge: RuntimeExperimentDiagnosticBridge;
  assessments: readonly HypothesisAssessment[];
}

export function reassessHypothesesFromRuntimeExperiment(
  set: DiagnosticHypothesisSet,
  qualification: RuntimeExperimentQualification,
  trials: readonly RuntimeExperimentTrial[],
): RuntimeExperimentDiagnosticAssessment {
  const bridge = runtimeExperimentDiagnosticEvidence(
    qualification,
    trials,
  );
  return {
    bridge,
    assessments: assessDiagnosticHypotheses(
      set,
      bridge.observations,
    ),
  };
}
