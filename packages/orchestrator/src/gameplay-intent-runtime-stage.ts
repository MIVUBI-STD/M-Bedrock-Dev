import {
  gateRuntimeStateOutcomeAgainstIntent,
  type IntentDiagnosticGateResult,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import type {
  RuntimeOutcomeObservation,
  RuntimeStateObservation,
} from "../../project-model/src/index.js";

export interface GameplayIntentRuntimeAssessment {
  outcomeObservation: RuntimeOutcomeObservation;
  result: IntentDiagnosticGateResult;
}

export interface GameplayIntentRuntimeAnalysis {
  assessments: readonly GameplayIntentRuntimeAssessment[];
  designedBehavior: number;
  probableDefects: number;
  ambiguousIntent: number;
  insufficientEvidence: number;
}

export function analyzeGameplayIntentRuntime(
  intent: GameplayIntentModel,
  stateObservations: readonly RuntimeStateObservation[],
  outcomeObservations: readonly RuntimeOutcomeObservation[],
): GameplayIntentRuntimeAnalysis {
  const assessments = outcomeObservations.map(
    (outcomeObservation): GameplayIntentRuntimeAssessment => ({
      outcomeObservation,
      result: gateRuntimeStateOutcomeAgainstIntent({
        intent,
        outcomeId: outcomeObservation.outcomeId,
        stateSnapshot: {
          schemaVersion: 1,
          observations: stateObservations,
        },
        ...(outcomeObservation.scope === undefined
          ? {}
          : { scope: outcomeObservation.scope }),
        ...(outcomeObservation.observedAt?.tick === undefined
          ? {}
          : {
              atOrBeforeTick:
                outcomeObservation.observedAt.tick,
            }),
        observationEvidenceIds: [
          outcomeObservation.evidenceId,
        ],
      }),
    }),
  );

  return {
    assessments,
    designedBehavior: assessments.filter(
      (item) =>
        item.result.disposition === "designed-behavior",
    ).length,
    probableDefects: assessments.filter(
      (item) =>
        item.result.disposition === "probable-defect",
    ).length,
    ambiguousIntent: assessments.filter(
      (item) =>
        item.result.disposition === "ambiguous-intent",
    ).length,
    insufficientEvidence: assessments.filter(
      (item) =>
        item.result.disposition === "insufficient-evidence",
    ).length,
  };
}
