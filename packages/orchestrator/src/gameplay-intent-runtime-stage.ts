import {
  gateRuntimeStateOutcomeAgainstIntent,
  type IntentDiagnosticGateResult,
} from "../../diagnostic-reasoning/src/index.js";
import {
  planGameplayOutcomeRuntimeObservations,
  type GameplayIntentModel,
  type GameplayRuntimeObservationNeed,
} from "../../gameplay-intent/src/index.js";
import {
  resolveRuntimeStateSnapshot,
  type RuntimeOutcomeObservation,
  type RuntimeStateObservation,
} from "../../project-model/src/index.js";

export interface GameplayIntentRuntimeAssessment {
  outcomeObservation: RuntimeOutcomeObservation;
  result: IntentDiagnosticGateResult;
  observationNeeds: readonly GameplayRuntimeObservationNeed[];
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
  const stateSnapshot = {
    schemaVersion: 1 as const,
    observations: stateObservations,
  };

  const assessments = outcomeObservations.map(
    (outcomeObservation): GameplayIntentRuntimeAssessment => {
      const resolution = resolveRuntimeStateSnapshot(
        stateSnapshot,
        {
          ...(outcomeObservation.scope === undefined
            ? {}
            : { scope: outcomeObservation.scope }),
          ...(outcomeObservation.observedAt?.tick === undefined
            ? {}
            : {
                atOrBeforeTick:
                  outcomeObservation.observedAt.tick,
              }),
        },
      );

      const result = gateRuntimeStateOutcomeAgainstIntent({
        intent,
        outcomeId: outcomeObservation.outcomeId,
        stateSnapshot,
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
      });

      return {
        outcomeObservation,
        result,
        observationNeeds:
          result.disposition === "insufficient-evidence" ||
          result.disposition === "ambiguous-intent"
            ? planGameplayOutcomeRuntimeObservations(
                intent,
                outcomeObservation.outcomeId,
                resolution.values,
              )
            : [],
      };
    },
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
