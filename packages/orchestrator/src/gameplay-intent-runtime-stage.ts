import {
  gateRuntimeStateOutcomeAgainstIntent,
  type IntentDiagnosticGateResult,
} from "../../diagnostic-reasoning/src/index.js";
import {
  assessGameplayRouteObservation,
  planGameplayOutcomeRuntimeObservations,
  type GameplayIntentModel,
  type GameplayRouteObservationAssessment,
  type GameplayRuntimeObservationNeed,
} from "../../gameplay-intent/src/index.js";
import {
  resolveRuntimeStateSnapshot,
  type RuntimeOutcomeObservation,
  type RuntimeRouteObservation,
  type RuntimeStateObservation,
} from "../../project-model/src/index.js";

export interface GameplayIntentRuntimeAssessment {
  outcomeObservation: RuntimeOutcomeObservation;
  result: IntentDiagnosticGateResult;
  observationNeeds: readonly GameplayRuntimeObservationNeed[];
}

export interface GameplayIntentRouteRuntimeAssessment {
  routeObservation: RuntimeRouteObservation;
  assessment: GameplayRouteObservationAssessment;
}

export interface GameplayIntentRuntimeAnalysis {
  assessments: readonly GameplayIntentRuntimeAssessment[];
  routeAssessments: readonly GameplayIntentRouteRuntimeAssessment[];
  designedBehavior: number;
  probableDefects: number;
  ambiguousIntent: number;
  insufficientEvidence: number;
  routeResolved: number;
  routeAmbiguous: number;
  routeUnresolved: number;
}

export function analyzeGameplayIntentRuntime(
  intent: GameplayIntentModel,
  stateObservations: readonly RuntimeStateObservation[],
  outcomeObservations: readonly RuntimeOutcomeObservation[],
  routeObservations: readonly RuntimeRouteObservation[] = [],
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

  const routeAssessments = routeObservations.map(
    (routeObservation): GameplayIntentRouteRuntimeAssessment => {
      const arenaId = routeObservation.scope.arenaId;
      if (arenaId === undefined) {
        return {
          routeObservation,
          assessment: {
            disposition: "unresolved",
            ...(routeObservation.routeIndex === undefined
              ? {}
              : { routeIndex: routeObservation.routeIndex }),
            ...(routeObservation.routeId === undefined
              ? {}
              : { routeId: routeObservation.routeId }),
            reasons: [
              "Runtime route observation is missing scope.arenaId, so authored route projection cannot select a context.",
            ],
          },
        };
      }

      return {
        routeObservation,
        assessment: assessGameplayRouteObservation(
          intent,
          {
            context: arenaId,
            ...(routeObservation.routeIndex === undefined
              ? {}
              : { routeIndex: routeObservation.routeIndex }),
            ...(routeObservation.routeId === undefined
              ? {}
              : { routeId: routeObservation.routeId }),
            worldLocation: routeObservation.worldLocation,
          },
        ),
      };
    },
  );

  return {
    assessments,
    routeAssessments,
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
    routeResolved: routeAssessments.filter(
      (item) =>
        item.assessment.disposition === "resolved",
    ).length,
    routeAmbiguous: routeAssessments.filter(
      (item) =>
        item.assessment.disposition === "ambiguous",
    ).length,
    routeUnresolved: routeAssessments.filter(
      (item) =>
        item.assessment.disposition === "unresolved",
    ).length,
  };
}
