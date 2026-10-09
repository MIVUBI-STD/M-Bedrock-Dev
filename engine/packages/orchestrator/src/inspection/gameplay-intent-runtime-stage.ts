import {
  gateRuntimeStateOutcomeAgainstIntent,
  type IntentDiagnosticGateResult,
} from "../../../diagnostic-reasoning/src/index.js";
import {
  assessGameplayRouteObservation,
  planGameplayOutcomeRuntimeObservations,
  planGameplayRouteRuntimeObservations,
  type GameplayIntentModel,
  type GameplayRouteObservationAssessment,
  type GameplayRouteRuntimeObservationNeed,
  type GameplayRuntimeObservationNeed,
} from "../../../gameplay-intent/src/index.js";
import {
  planGameplayRouteRuntimeEvidence,
  type GameplayRouteRuntimeEvidencePlan,
} from "../inspection/gameplay-route-runtime-plan.js";
import {
  analyzeGameplayRouteCauseCandidates,
  type GameplayRouteCauseAnalysis,
} from "../inspection/gameplay-route-candidate-analysis.js";
import type {
  EntityAiStackAnalysis,
} from "../inspection/entity-ai-stack-analysis.js";
import type {
  RouteNavigationEnvironmentAnalysis,
} from "../inspection/route-navigation-environment-analysis.js";
import {
  resolveRuntimeStateSnapshot,
  type RuntimeNavigationStallObservation,
  type RuntimeNavigationTargetObservation,
  type RuntimeOutcomeObservation,
  type RuntimeRouteChunkAvailabilityObservation,
  type RuntimeRouteObservation,
  type RuntimeRouteReachabilityObservation,
  type RuntimeStateObservation,
} from "../../../project-model/src/index.js";

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

export interface GameplayRouteMotionSeries {
  sampleCount: number;
  evidenceIds: readonly string[];
  firstTick?: number;
  lastTick?: number;
  displacement?: number;
}

export type GameplayRouteStallInvestigationDirection =
  | "route-context-incomplete"
  | "target-assignment-divergence"
  | "route-chunk-unavailable"
  | "route-unreachable"
  | "navigation-target-divergence"
  | "entity-ai-stack-incomplete"
  | "navigation-environment-incompatible"
  | "navigation-runtime-suspect"
  | "evidence-incomplete";

export interface GameplayRouteStallRuntimeAssessment {
  stallObservation: RuntimeNavigationStallObservation;
  disposition: GameplayRouteStallDisposition;
  routeAssessment?: GameplayIntentRouteRuntimeAssessment;
  motionSeries?: GameplayRouteMotionSeries;
  navigationTargetObservation?: RuntimeNavigationTargetObservation;
  reachabilityObservation?: RuntimeRouteReachabilityObservation;
  chunkAvailabilityObservation?: RuntimeRouteChunkAvailabilityObservation;
  navigationTargetDistanceToAuthoredTarget?: number;
  navigationTargetRouteMatchesAuthoredTarget?: boolean;
  observationNeeds: readonly GameplayRouteRuntimeObservationNeed[];
  evidencePlan: GameplayRouteRuntimeEvidencePlan;
  investigationDirection: GameplayRouteStallInvestigationDirection;
  candidateAnalysis: GameplayRouteCauseAnalysis;
  reasons: readonly string[];
}

type GameplayRouteStallAssessmentBase =
  Omit<
    GameplayRouteStallRuntimeAssessment,
    "evidencePlan" | "investigationDirection" | "candidateAnalysis"
  >;

export interface GameplayIntentRuntimeAnalysis {
  assessments: readonly GameplayIntentRuntimeAssessment[];
  routeAssessments: readonly GameplayIntentRouteRuntimeAssessment[];
  routeStallAssessments: readonly GameplayRouteStallRuntimeAssessment[];
  designedBehavior: number;
  confirmedDefects: number;
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
): GameplayRouteStallAssessmentBase {
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

function sameRouteRuntimeScope(
  stall: RuntimeNavigationStallObservation,
  scope: {
    arenaId?: string;
    arenaGeneration?: number;
    entityKey?: string;
  },
  entityKey: string,
): boolean {
  if (entityKey !== stall.entityKey) return false;
  if (
    stall.scope.arenaId !== undefined &&
    scope.arenaId !== undefined &&
    stall.scope.arenaId !== scope.arenaId
  ) {
    return false;
  }
  if (
    stall.scope.arenaGeneration !== undefined &&
    scope.arenaGeneration !== undefined &&
    stall.scope.arenaGeneration !== scope.arenaGeneration
  ) {
    return false;
  }
  return true;
}

function atOrBeforeStall(
  stall: RuntimeNavigationStallObservation,
  observedTick: number | undefined,
): boolean {
  const stallTick = stall.observedAt?.tick;
  if (stallTick === undefined) return true;
  return observedTick !== undefined && observedTick <= stallTick;
}

function latestByTick<T>(
  items: readonly T[],
  tick: (item: T) => number | undefined,
): T | undefined {
  if (items.length === 0) return undefined;
  const withTick = items.filter(
    (item) => tick(item) !== undefined,
  );
  if (withTick.length === items.length) {
    const latest = Math.max(
      ...withTick.map((item) => tick(item)!),
    );
    const latestItems = withTick.filter(
      (item) => tick(item) === latest,
    );
    return latestItems.length === 1
      ? latestItems[0]
      : undefined;
  }
  return items.length === 1 ? items[0] : undefined;
}

function selectLatestNavigationTargetForStall(
  stall: RuntimeNavigationStallObservation,
  observations: readonly RuntimeNavigationTargetObservation[],
): RuntimeNavigationTargetObservation | undefined {
  const compatible = observations.filter((item) =>
    sameRouteRuntimeScope(
      stall,
      item.scope,
      item.entityKey,
    ) &&
    atOrBeforeStall(
      stall,
      item.observedAt?.tick,
    )
  );
  return latestByTick(
    compatible,
    (item) => item.observedAt?.tick,
  );
}

function selectLatestReachabilityForStall(
  stall: RuntimeNavigationStallObservation,
  observations: readonly RuntimeRouteReachabilityObservation[],
): RuntimeRouteReachabilityObservation | undefined {
  const compatible = observations.filter((item) =>
    sameRouteRuntimeScope(
      stall,
      item.scope,
      item.entityKey,
    ) &&
    atOrBeforeStall(
      stall,
      item.observedAt?.tick,
    )
  );
  return latestByTick(
    compatible,
    (item) => item.observedAt?.tick,
  );
}

function routeMotionSeriesForStall(
  stall: RuntimeNavigationStallObservation,
  observations: readonly RuntimeRouteObservation[],
): GameplayRouteMotionSeries | undefined {
  const compatible = observations
    .filter((item) =>
      sameRouteRuntimeScope(
        stall,
        item.scope,
        item.entityKey,
      ) &&
      atOrBeforeStall(
        stall,
        item.observedAt?.tick,
      ) &&
      (
        stall.routeId === undefined ||
        item.routeId === undefined ||
        stall.routeId === item.routeId
      )
    )
    .sort(
      (a, b) =>
        (a.observedAt?.tick ?? Number.MIN_SAFE_INTEGER) -
        (b.observedAt?.tick ?? Number.MIN_SAFE_INTEGER),
    );

  if (compatible.length < 2) return undefined;

  const first = compatible[0]!;
  const last = compatible[compatible.length - 1]!;
  const dx =
    last.worldLocation.x - first.worldLocation.x;
  const dy =
    last.worldLocation.y - first.worldLocation.y;
  const dz =
    last.worldLocation.z - first.worldLocation.z;

  return {
    sampleCount: compatible.length,
    evidenceIds: compatible.map(
      (item) => item.evidenceId,
    ),
    ...(first.observedAt?.tick === undefined
      ? {}
      : { firstTick: first.observedAt.tick }),
    ...(last.observedAt?.tick === undefined
      ? {}
      : { lastTick: last.observedAt.tick }),
    displacement: Math.sqrt(
      dx * dx + dy * dy + dz * dz,
    ),
  };
}

function chunkAvailabilityForStall(
  stall: RuntimeNavigationStallObservation,
  observations:
    readonly RuntimeRouteChunkAvailabilityObservation[],
): RuntimeRouteChunkAvailabilityObservation | undefined {
  const requestId =
    "route-stall::" +
    stall.evidenceId +
    "::chunk-route-availability";
  const matches = observations.filter(
    (item) => item.requestId === requestId,
  );
  return matches.length === 1
    ? matches[0]
    : undefined;
}

function routeStallInvestigationDirection(
  base: GameplayRouteStallAssessmentBase,
  motionSeries: GameplayRouteMotionSeries | undefined,
  navigationTarget:
    RuntimeNavigationTargetObservation | undefined,
  navigationTargetRouteMatches:
    boolean | undefined,
  reachability:
    RuntimeRouteReachabilityObservation | undefined,
  chunkAvailability:
    RuntimeRouteChunkAvailabilityObservation | undefined,
): GameplayRouteStallInvestigationDirection {
  if (
    base.disposition === "ambiguous-route-context" ||
    base.disposition === "no-route-observation" ||
    base.disposition === "unresolved-route-evidence"
  ) {
    return "route-context-incomplete";
  }

  if (
    base.disposition === "target-nearest-divergence"
  ) {
    return "target-assignment-divergence";
  }

  if (chunkAvailability?.state === "not-loaded") {
    return "route-chunk-unavailable";
  }

  if (reachability?.reachable === false) {
    return "route-unreachable";
  }

  if (navigationTargetRouteMatches === false) {
    return "navigation-target-divergence";
  }

  if (
    base.disposition === "target-nearest-match" &&
    motionSeries !== undefined &&
    navigationTarget !== undefined &&
    navigationTargetRouteMatches === true &&
    reachability?.reachable === true &&
    chunkAvailability?.state === "loaded"
  ) {
    return "navigation-runtime-suspect";
  }

  return "evidence-incomplete";
}

function navigationTargetComparison(
  routeAssessment:
    GameplayIntentRouteRuntimeAssessment | undefined,
  navigationTarget:
    RuntimeNavigationTargetObservation | undefined,
): {
  distance?: number;
  routeMatches?: boolean;
} {
  const target = routeAssessment?.assessment.target;
  if (!target || !navigationTarget) return {};

  const dx =
    navigationTarget.targetLocation.x -
    target.worldPoint.x;
  const dy =
    navigationTarget.targetLocation.y -
    target.worldPoint.y;
  const dz =
    navigationTarget.targetLocation.z -
    target.worldPoint.z;

  const routeMatches =
    (
      navigationTarget.routeId === undefined ||
      navigationTarget.routeId === target.routeId
    ) &&
    (
      navigationTarget.routeIndex === undefined ||
      navigationTarget.routeIndex === target.routeIndex
    );

  return {
    distance: Math.sqrt(
      dx * dx + dy * dy + dz * dz,
    ),
    routeMatches,
  };
}

export interface GameplayIntentRuntimeOptions {
  dimension?: string;
  entityAiStack?: EntityAiStackAnalysis;
  routeNavigationEnvironment?: RouteNavigationEnvironmentAnalysis;
}

export function analyzeGameplayIntentRuntime(
  intent: GameplayIntentModel,
  stateObservations: readonly RuntimeStateObservation[],
  outcomeObservations: readonly RuntimeOutcomeObservation[],
  routeObservations: readonly RuntimeRouteObservation[] = [],
  navigationStallObservations:
    readonly RuntimeNavigationStallObservation[] = [],
  navigationTargetObservations:
    readonly RuntimeNavigationTargetObservation[] = [],
  routeReachabilityObservations:
    readonly RuntimeRouteReachabilityObservation[] = [],
  routeChunkAvailabilityObservations:
    readonly RuntimeRouteChunkAvailabilityObservation[] = [],
  options: GameplayIntentRuntimeOptions = {},
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
      (stall): GameplayRouteStallRuntimeAssessment => {
        const baseAssessment = assessRouteStall(
          stall,
          routeAssessments,
        );
        const motionSeries =
          routeMotionSeriesForStall(
            stall,
            routeObservations,
          );
        const navigationTargetObservation =
          selectLatestNavigationTargetForStall(
            stall,
            navigationTargetObservations,
          );
        const reachabilityObservation =
          selectLatestReachabilityForStall(
            stall,
            routeReachabilityObservations,
          );
        const chunkAvailabilityObservation =
          chunkAvailabilityForStall(
            stall,
            routeChunkAvailabilityObservations,
          );
        const navigationComparison =
          navigationTargetComparison(
            baseAssessment.routeAssessment,
            navigationTargetObservation,
          );

        const fulfilled = new Map<
          GameplayRouteRuntimeObservationNeed["kind"],
          {
            evidenceIds: readonly string[];
            reason: string;
          }
        >();

        if (motionSeries) {
          fulfilled.set("entity-motion-series", {
            evidenceIds: motionSeries.evidenceIds,
            reason:
              "At least two scoped route-position observations exist at or before the stall.",
          });
        }

        const routeObservation =
          baseAssessment.routeAssessment
            ?.routeObservation;
        if (routeObservation?.routeId !== undefined) {
          fulfilled.set("route-context", {
            evidenceIds: [routeObservation.evidenceId],
            reason:
              "A scoped runtime route observation includes routeId.",
          });
        }
        if (
          routeObservation?.routeIndex !== undefined
        ) {
          fulfilled.set("route-target-assignment", {
            evidenceIds: [routeObservation.evidenceId],
            reason:
              "A scoped runtime route observation includes routeIndex.",
          });
        }

        if (navigationTargetObservation) {
          fulfilled.set("navigation-target", {
            evidenceIds: [
              navigationTargetObservation.evidenceId,
            ],
            reason:
              "A scoped navigation-target observation exists at or before the stall.",
          });
        }

        if (reachabilityObservation) {
          fulfilled.set("route-reachability", {
            evidenceIds: [
              reachabilityObservation.evidenceId,
            ],
            reason:
              "A scoped route-reachability observation exists at or before the stall.",
          });
        }

        if (
          chunkAvailabilityObservation &&
          chunkAvailabilityObservation.state !== "unknown"
        ) {
          fulfilled.set("chunk-route-availability", {
            evidenceIds: [
              chunkAvailabilityObservation.evidenceId,
            ],
            reason:
              "The generated chunk-availability runtime probe returned a definitive loaded/not-loaded result.",
          });
        }

        const investigationDirection =
          routeStallInvestigationDirection(
            baseAssessment,
            motionSeries,
            navigationTargetObservation,
            navigationComparison.routeMatches,
            reachabilityObservation,
            chunkAvailabilityObservation,
          );

        const completeAssessment = {
          ...baseAssessment,
          ...(motionSeries === undefined
            ? {}
            : { motionSeries }),
          ...(navigationTargetObservation === undefined
            ? {}
            : { navigationTargetObservation }),
          ...(reachabilityObservation === undefined
            ? {}
            : { reachabilityObservation }),
          ...(chunkAvailabilityObservation === undefined
            ? {}
            : { chunkAvailabilityObservation }),
          ...(navigationComparison.distance === undefined
            ? {}
            : {
                navigationTargetDistanceToAuthoredTarget:
                  navigationComparison.distance,
              }),
          ...(navigationComparison.routeMatches === undefined
            ? {}
            : {
                navigationTargetRouteMatchesAuthoredTarget:
                  navigationComparison.routeMatches,
              }),
          investigationDirection,
          evidencePlan:
            planGameplayRouteRuntimeEvidence({
              stall,
              ...(baseAssessment.routeAssessment === undefined
                ? {}
                : {
                    routeAssessment:
                      baseAssessment.routeAssessment
                        .assessment,
                  }),
              needs: baseAssessment.observationNeeds,
              fulfilled,
              ...(options.dimension === undefined
                ? {}
                : { dimension: options.dimension }),
            }),
        };

        const candidateAnalysis =
          analyzeGameplayRouteCauseCandidates(
            completeAssessment,
            options.entityAiStack?.assessments ?? [],
          );
        const finalInvestigationDirection:
          GameplayRouteStallInvestigationDirection =
            candidateAnalysis.leadingCandidateId ===
            "entity-ai-stack"
              ? "entity-ai-stack-incomplete"
              : candidateAnalysis.leadingCandidateId ===
                  "navigation-environment"
                ? "navigation-environment-incompatible"
                : investigationDirection;

        return {
          ...completeAssessment,
          investigationDirection:
            finalInvestigationDirection,
          candidateAnalysis,
        };
      },
    );

  return {
    assessments,
    routeAssessments,
    routeStallAssessments,
    designedBehavior: assessments.filter(
      (item) =>
        item.result.disposition === "designed-behavior",
    ).length,
    confirmedDefects: assessments.filter(
      (item) =>
        item.result.disposition === "confirmed-defect",
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
