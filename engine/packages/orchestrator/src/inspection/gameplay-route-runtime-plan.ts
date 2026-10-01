import {
  parseRuntimeProbeRequest,
  type RuntimeNavigationStallObservation,
  type RuntimeProbeRequest,
} from "../../../project-model/src/index.js";
import type {
  GameplayRouteObservationAssessment,
  GameplayRouteRuntimeObservationNeed,
} from "../../../gameplay-intent/src/index.js";

export type GameplayRouteInstrumentationKind =
  | "entity-progress-probe"
  | "route-observation"
  | "navigation-target-observation"
  | "route-reachability-observation";

export interface GameplayRouteInstrumentationRequirement {
  need: GameplayRouteRuntimeObservationNeed["kind"];
  instrumentation: GameplayRouteInstrumentationKind;
  reason: string;
  requiredFields: readonly string[];
}

export interface GameplayRouteRuntimePlanBlock {
  need: GameplayRouteRuntimeObservationNeed["kind"];
  reason: string;
}

export interface GameplayRouteRuntimeSatisfiedNeed {
  need: GameplayRouteRuntimeObservationNeed["kind"];
  evidenceIds: readonly string[];
  reason: string;
}

export interface GameplayRouteRuntimeEvidencePlan {
  instrumentation: readonly GameplayRouteInstrumentationRequirement[];
  runtimeProbeRequests: readonly RuntimeProbeRequest[];
  blocked: readonly GameplayRouteRuntimePlanBlock[];
  satisfied: readonly GameplayRouteRuntimeSatisfiedNeed[];
}

export interface GameplayRouteRuntimeEvidencePlanInput {
  stall: RuntimeNavigationStallObservation;
  routeAssessment?: GameplayRouteObservationAssessment;
  needs: readonly GameplayRouteRuntimeObservationNeed[];
  dimension?: string;
  requestId?: string;
  fulfilled?: ReadonlyMap<
    GameplayRouteRuntimeObservationNeed["kind"],
    {
      evidenceIds: readonly string[];
      reason: string;
    }
  >;
}

function targetLocation(
  assessment: GameplayRouteObservationAssessment | undefined,
): { x: number; y: number; z: number } | undefined {
  return assessment?.target?.worldPoint;
}

export function planGameplayRouteRuntimeEvidence(
  input: GameplayRouteRuntimeEvidencePlanInput,
): GameplayRouteRuntimeEvidencePlan {
  const instrumentation: GameplayRouteInstrumentationRequirement[] = [];
  const runtimeProbeRequests: RuntimeProbeRequest[] = [];
  const blocked: GameplayRouteRuntimePlanBlock[] = [];
  const satisfied: GameplayRouteRuntimeSatisfiedNeed[] = [];

  const addInstrumentation = (
    requirement: GameplayRouteInstrumentationRequirement,
  ): void => {
    if (
      !instrumentation.some(
        (item) =>
          item.need === requirement.need &&
          item.instrumentation === requirement.instrumentation,
      )
    ) {
      instrumentation.push(requirement);
    }
  };

  for (const need of input.needs) {
    const fulfilled = input.fulfilled?.get(need.kind);
    if (fulfilled) {
      satisfied.push({
        need: need.kind,
        evidenceIds: [...fulfilled.evidenceIds],
        reason: fulfilled.reason,
      });
      continue;
    }

    switch (need.kind) {
      case "entity-motion-series":
        addInstrumentation({
          need: need.kind,
          instrumentation: "entity-progress-probe",
          reason: need.reason,
          requiredFields: [
            "entityKey",
            "tick",
            "position",
            "expectedToProgress",
            "scope.arenaId",
            "routeId",
            "routeIndex",
          ],
        });
        break;

      case "route-context":
      case "route-target-assignment":
        addInstrumentation({
          need: need.kind,
          instrumentation: "route-observation",
          reason: need.reason,
          requiredFields: [
            "entityKey",
            "worldLocation",
            "scope.arenaId",
            "routeId",
            "routeIndex",
          ],
        });
        break;

      case "navigation-target":
        addInstrumentation({
          need: need.kind,
          instrumentation: "navigation-target-observation",
          reason: need.reason,
          requiredFields: [
            "entityKey",
            "targetLocation",
            "scope.arenaId",
            "routeId",
            "routeIndex",
            "mechanism",
          ],
        });
        break;

      case "route-reachability":
        addInstrumentation({
          need: need.kind,
          instrumentation: "route-reachability-observation",
          reason: need.reason,
          requiredFields: [
            "entityKey",
            "reachable",
            "scope.arenaId",
            "routeId",
            "routeIndex",
            "mechanism",
          ],
        });
        break;

      case "chunk-route-availability": {
        const location = targetLocation(input.routeAssessment);
        if (!location) {
          blocked.push({
            need: need.kind,
            reason:
              "Chunk availability cannot be bound because the authored route target world coordinate is unresolved.",
          });
          break;
        }
        if (!input.dimension) {
          blocked.push({
            need: need.kind,
            reason:
              "Chunk availability requires an explicit runtime dimension; no dimension was inferred.",
          });
          break;
        }

        const requestId =
          input.requestId ??
          "route-stall::" +
            input.stall.evidenceId +
            "::chunk-route-availability";

        runtimeProbeRequests.push(
          parseRuntimeProbeRequest({
            schemaVersion: 1,
            requestId,
            probeId: "gameplay-route-chunk-availability",
            incidentId:
              "route-stall::" + input.stall.evidenceId,
            predicate: "route-target-chunk-loaded",
            scope: input.stall.scope,
            ...(input.stall.observedAt?.tick === undefined
              ? {}
              : {
                  runtimeTick:
                    input.stall.observedAt.tick,
                }),
            query: {
              kind: "chunk-loaded",
              dimension: input.dimension,
              location,
            },
            outcomeByState: {
              present: "route-target-chunk-loaded",
              absent: "route-target-chunk-not-loaded",
              unknown: "route-target-chunk-unknown",
            },
          }),
        );
        break;
      }
    }
  }

  return {
    instrumentation,
    runtimeProbeRequests,
    blocked,
    satisfied,
  };
}
