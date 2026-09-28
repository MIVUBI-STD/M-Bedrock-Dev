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

export interface RuntimeDiagnosticArmObservation {
  armId: string;
  observation: DiagnosticEvidenceObservation;
  sourceEvidenceIds: readonly string[];
}

export interface RuntimeDiagnosticPredicateEvidence {
  predicate: string;
  observation: DiagnosticEvidenceObservation;
  ceiling: RuntimeDiagnosticEvidenceCeiling;
  sourceEvidenceIds: readonly string[];
  armObservations?: readonly RuntimeDiagnosticArmObservation[];
  interventionContrast?: boolean;
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

interface RuntimePredicateRecord {
  trialId: string;
  armId: string;
  recordIndex: number;
  record: RuntimeEvidenceRecord;
}

function evidenceIdsFor(
  experimentId: string,
  predicate: string,
  records: readonly RuntimePredicateRecord[],
): readonly string[] {
  return records.map((entry) => {
    const suffix = [
      "predicate",
      predicate,
      "record",
      String(entry.recordIndex),
    ].join(":");

    return entry.record.provenanceKey
      ? entry.record.provenanceKey + ":" + suffix
      : [
          "runtime-experiment",
          experimentId,
          "trial",
          entry.trialId,
          "arm",
          entry.armId,
          suffix,
          String(entry.record.observedAt?.tick ?? "na"),
        ].join(":");
  });
}

function armObservationsFor(
  experimentId: string,
  predicate: string,
  records: readonly RuntimePredicateRecord[],
): RuntimeDiagnosticArmObservation[] {
  const byArm = new Map<string, RuntimePredicateRecord[]>();

  for (const entry of records) {
    const current = byArm.get(entry.armId) ?? [];
    current.push(entry);
    byArm.set(entry.armId, current);
  }

  return [...byArm.entries()]
    .map(([armId, entries]) => {
      const state = aggregateState(
        entries.map((entry) => entry.record),
      );
      return {
        armId,
        observation: {
          predicate,
          state,
          evidenceId: [
            "runtime-experiment",
            experimentId,
            predicate,
            "arm",
            armId,
            state,
          ].join(":"),
        },
        sourceEvidenceIds: evidenceIdsFor(
          experimentId,
          predicate,
          entries,
        ),
      };
    })
    .sort((a, b) => a.armId.localeCompare(b.armId));
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
    RuntimePredicateRecord[]
  >();

  for (const trial of completed) {
    for (const [recordIndex, record] of trial.evidence.entries()) {
      const list = byPredicate.get(record.predicate) ?? [];
      list.push({
        trialId: trial.id,
        armId: trial.identity.armId,
        recordIndex,
        record,
      });
      byPredicate.set(record.predicate, list);
    }
  }

  const predicates = [...byPredicate.entries()]
    .map(([predicate, records]) => {
      const state = aggregateState(
        records.map((entry) => entry.record),
      );
      const ceiling = ceilingFor(
        predicate,
        qualification,
      );
      const sourceEvidenceIds = evidenceIdsFor(
        qualification.experimentId,
        predicate,
        records,
      );
      const armObservations = armObservationsFor(
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
        armObservations,
        interventionContrast:
          qualification.controlTreatmentContrastPredicates.includes(
            predicate,
          ),
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
