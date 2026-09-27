import {
  gateRuntimeStateOutcomeAgainstIntent,
  type IntentDiagnosticGateResult,
} from "../../diagnostic-reasoning/src/index.js";
import {
  assessGameplayRouteObservation,
  planGameplayOutcomeRuntimeObservations,
  planGameplayRouteRuntimeObservations,
  type GameplayIntentModel,
  type GameplayRouteObservationAssessment,
  type GameplayRouteRuntimeObservationNeed,
  type GameplayRuntimeObservationNeed,
} from "../../gameplay-intent/src/index.js";
import {
  resolveRuntimeStateSnapshot,
  type RuntimeNavigationStallObservation,
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

export type GameplayRouteStallDisposition =
  | "target-nearest-match"
  | "target-nearest-divergence"
  | "target-resolved"
  | "nearest-only"
  | "ambiguous-route-context"
  | "unresolved-route-evidence"
  | "no-route-observation";

export interface GameplayRouteStallRuntimeAssessment {
  stallObservation: RuntimeNavigationStallObservation;
  disposition: GameplayRouteStallDisposition;
  routeAssessment?: GameplayIntentRouteRuntimeAssessment;
  observationNeeds: readonly GameplayRouteRuntimeObservationNeed[];
  reasons: readonly string[];
}

export interface GameplayIntentRuntimeAnalysis {
  assessments: readonly GameplayIntentRuntimeAssessment[];
  routeAssessments: readonly GameplayIntentRouteRuntimeAssessment[];
  routeStallAssessments: readonly GameplayRouteStallRuntimeAssessment[];
  designedBehavior: number;
  probableDefects: number;
  ambiguousIntent: number;
  insufficientEvidence: number;
  routeResolved: number;
  routeAmbiguous: number;
  routeUnresolved: number;
  stallTargetNearestMatch: number;
  stallTargetNearestDivergence: number;
  stallAmbiguous: number;
  stallUnresolved: number;
}

function routeScopeCompatible(
  stall: RuntimeNavigationStallObservation,
  route: RuntimeRouteObservation,
): boolean {
  if (stall.entityKey !== route.entityKey) return false;

  if (
    stall.scope.arenaId !== undefined &&
    route.scope.arenaId !== undefined &&
    stall.scope.arenaId !== route.scope.arenaId
  ) {
    return false;
  }

  if (
    stall.scope.arenaGeneration !== undefined &&
    route.scope.arenaGeneration !== undefined &&
    stall.scope.arenaGeneration !==
      route.scope.arenaGeneration
  ) {
    return false;
  }

  if (
    stall.routeId !== undefined &&
    route.routeId !== undefined &&
    stall.routeId !== route.routeId
  ) {
    return false;
  }

  return true;
}

function selectRouteAssessmentForStall(
  stall: RuntimeNavigationStallObservation,
  routeAssessments:
    readonly GameplayIntentRouteRuntimeAssessment[],
): {
  assessment?: GameplayIntentRouteRuntimeAssessment;
  reason?: string;
} {
  let candidates = routeAssessments.filter((item) =>
    routeScopeCompatible(
      stall,
      item.routeObservation,
    )
  );

  const stallTick = stall.observedAt?.tick;
  if (stallTick !== undefined) {
    candidates = candidates.filter((item) => {
      const tick =
        item.routeObservation.observedAt?.tick;
      return tick !== undefined && tick <= stallTick;
    });

    if (candidates.length === 0) {
      return {
        reason:
          "No temporally preceding route observation exists for this stalled entity in the same scope.",
      };
    }

    const latestTick = Math.max(
      ...candidates.map(
        (item) =>
          item.routeObservation.observedAt!.tick!,
      ),
    );
    candidates = candidates.filter(
      (item) =>
        item.routeObservation.observedAt?.tick ===
        latestTick,
    );
  }

  if (candidates.length === 1) {
    const assessment = candidates[0];
    if (assessment) return { assessment };
  }

  if (candidates.length === 0) {
    return {
      reason:
        "No compatible route observation exists for this stalled entity.",
    };
  }

  return {
    reason:
      "Multiple equally applicable route observations exist for this stalled entity; correlation is ambiguous.",
  };
}

function assessRouteStall(
  stall: RuntimeNavigationStallObservation,
  routeAssessments:
    readonly GameplayIntentRouteRuntimeAssessment[],
): GameplayRouteStallRuntimeAssessment {
  const selected =
    selectRouteAssessmentForStall(
      stall,
      routeAssessments,
    );

  if (!selected.assessment) {
    const unresolvedAssessment:
      GameplayRouteObservationAssessment = {
        disposition: "unresolved",
        ...(stall.routeId === undefined
          ? {}
          : { routeId: stall.routeId }),
        reasons: [
          selected.reason ??
            "No compatible route observation is available.",
        ],
      };
    return {
      stallObservation: stall,
      disposition: "no-route-observation",
      observationNeeds:
        planGameplayRouteRuntimeObservations(
          unresolvedAssessment,
        ),
      reasons: unresolvedAssessment.reasons,
    };
  }

  const route = selected.assessment;
  const assessment = route.assessment;

  if (assessment.disposition === "ambiguous") {
    return {
      stallObservation: stall,
      disposition: "ambiguous-route-context",
      routeAssessment: route,
      observationNeeds:
        planGameplayRouteRuntimeObservations(
          assessment,
        ),
      reasons: [
        ...assessment.reasons,
        "Stall cannot be assigned to one authored target without additional route context.",
      ],
    };
  }

  if (assessment.disposition === "unresolved") {
    return {
      stallObservation: stall,
      disposition: "unresolved-route-evidence",
      routeAssessment: route,
      observationNeeds:
        planGameplayRouteRuntimeObservations(
          assessment,
        ),
      reasons: [
        ...assessment.reasons,
        "Stall route evidence is incomplete.",
      ],
    };
  }

  const target = assessment.target;
  const nearest = assessment.nearest;

  if (target && nearest) {
    const matches =
      target.routeId === nearest.routeId &&
      target.routeIndex === nearest.routeIndex;

    return {
      stallObservation: stall,
      disposition: matches
        ? "target-nearest-match"
        : "target-nearest-divergence",
      routeAssessment: route,
      observationNeeds:
        planGameplayRouteRuntimeObservations(
          assessment,
        ),
      reasons: [
        ...assessment.reasons,
        matches
          ? "The nearest authored route point matches the resolved target path."
          : "The nearest authored route point differs from the resolved target path.",
      ],
    };
  }

  if (target) {
    return {
      stallObservation: stall,
      disposition: "target-resolved",
      routeAssessment: route,
      observationNeeds:
        planGameplayRouteRuntimeObservations(
          assessment,
        ),
      reasons: [
        ...assessment.reasons,
        "Authored target is resolved but no nearest-route comparison is available.",
      ],
    };
  }

  if (nearest) {
    return {
      stallObservation: stall,
      disposition: "nearest-only",
      routeAssessment: route,
      observationNeeds:
        planGameplayRouteRuntimeObservations(
          assessment,
        ),
      reasons: [
        ...assessment.reasons,
        "Nearest authored route point is known but target path is not resolved.",
      ],
    };
  }

  return {
    stallObservation: stall,
    disposition: "unresolved-route-evidence",
    routeAssessment: route,
    observationNeeds:
      planGameplayRouteRuntimeObservations(
        assessment,
      ),
    reasons: [
      ...assessment.reasons,
      "Resolved route assessment contains neither a target nor nearest point.",
    ],
  };
}

export function analyzeGameplayIntentRuntime(
  intent: GameplayIntentModel,
  stateObservations: readonly RuntimeStateObservation[],
  outcomeObservations: readonly RuntimeOutcomeObservation[],
  routeObservations: readonly RuntimeRouteObservation[] = [],
  navigationStallObservations:
    readonly RuntimeNavigationStallObservation[] = [],
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

  const routeStallAssessments =
    navigationStallObservations.map(
      (stall) =>
        assessRouteStall(
          stall,
          routeAssessments,
        ),
    );

  return {
    assessments,
    routeAssessments,
    routeStallAssessments,
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
    stallTargetNearestMatch:
      routeStallAssessments.filter(
        (item) =>
          item.disposition ===
          "target-nearest-match",
      ).length,
    stallTargetNearestDivergence:
      routeStallAssessments.filter(
        (item) =>
          item.disposition ===
          "target-nearest-divergence",
      ).length,
    stallAmbiguous:
      routeStallAssessments.filter(
        (item) =>
          item.disposition ===
          "ambiguous-route-context",
      ).length,
    stallUnresolved:
      routeStallAssessments.filter(
        (item) =>
          item.disposition ===
            "unresolved-route-evidence" ||
          item.disposition ===
            "no-route-observation",
      ).length,
  };
}
