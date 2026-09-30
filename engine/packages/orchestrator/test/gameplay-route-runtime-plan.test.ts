import { describe, expect, it } from "vitest";
import {
  planGameplayRouteRuntimeEvidence,
} from "../src/gameplay-route-runtime-plan.js";
import type {
  GameplayRouteObservationAssessment,
  GameplayRouteRuntimeObservationNeed,
} from "../../gameplay-intent/src/index.js";
import type {
  RuntimeNavigationStallObservation,
} from "../../project-model/src/index.js";

const stall: RuntimeNavigationStallObservation = {
  entityKey: "demo:zombie",
  routeId: "bridge",
  stalledTicks: 80,
  distanceDelta: 0.1,
  scope: {
    arenaId: "arena_6",
    arenaGeneration: 3,
    entityKey: "demo:zombie",
  },
  observedAt: { tick: 225 },
  evidenceId: "telemetry-stall:stall-1",
};

const routeAssessment: GameplayRouteObservationAssessment = {
  disposition: "resolved",
  routeId: "bridge",
  routeIndex: 606,
  target: {
    routeNodeId: "spatial-region:route-bridge",
    routeId: "bridge",
    routeIndex: 606,
    localPoint: {
      x: 23,
      y: -28.5,
      z: 0.5,
    },
    worldPoint: {
      x: 1778,
      y: -28.5,
      z: 0.5,
    },
  },
  nearest: {
    routeNodeId: "spatial-region:route-bridge",
    routeId: "bridge",
    routeIndex: 606,
    worldPoint: {
      x: 1778,
      y: -28.5,
      z: 0.5,
    },
    distance: 1.58,
  },
  distanceToTarget: 1.58,
  reasons: [],
};

const needs: GameplayRouteRuntimeObservationNeed[] = [
  {
    kind: "entity-motion-series",
    reason: "Observe motion.",
  },
  {
    kind: "navigation-target",
    reason: "Observe navigation target.",
  },
  {
    kind: "route-reachability",
    reason: "Observe reachability.",
  },
  {
    kind: "chunk-route-availability",
    reason: "Observe chunk availability.",
  },
];

describe("gameplay route runtime evidence planner", () => {
  it("binds semantic evidence needs to instrumentation and safe chunk probe", () => {
    const plan = planGameplayRouteRuntimeEvidence({
      stall,
      routeAssessment,
      needs,
      dimension: "overworld",
    });

    expect(plan.instrumentation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          need: "entity-motion-series",
          instrumentation: "entity-progress-probe",
        }),
        expect.objectContaining({
          need: "navigation-target",
          instrumentation: "navigation-target-observation",
        }),
        expect.objectContaining({
          need: "route-reachability",
          instrumentation: "route-reachability-observation",
        }),
      ]),
    );

    expect(plan.runtimeProbeRequests).toEqual([
      expect.objectContaining({
        probeId: "gameplay-route-chunk-availability",
        predicate: "route-target-chunk-loaded",
        runtimeTick: 225,
        scope: expect.objectContaining({
          arenaId: "arena_6",
          arenaGeneration: 3,
          entityKey: "demo:zombie",
        }),
        query: {
          kind: "chunk-loaded",
          dimension: "overworld",
          location: {
            x: 1778,
            y: -28.5,
            z: 0.5,
          },
        },
      }),
    ]);
    expect(plan.blocked).toEqual([]);
  });

  it("blocks chunk probing without explicit dimension", () => {
    const plan = planGameplayRouteRuntimeEvidence({
      stall,
      routeAssessment,
      needs: [needs[3]!],
    });

    expect(plan.runtimeProbeRequests).toEqual([]);
    expect(plan.blocked).toEqual([
      expect.objectContaining({
        need: "chunk-route-availability",
        reason: expect.stringMatching(
          /explicit runtime dimension/,
        ),
      }),
    ]);
  });

  it("does not request instrumentation when evidence is already fulfilled", () => {
    const fulfilled = new Map([
      [
        "entity-motion-series" as const,
        {
          evidenceIds: ["route-a", "route-b"],
          reason: "Two samples already exist.",
        },
      ],
      [
        "navigation-target" as const,
        {
          evidenceIds: ["nav-1"],
          reason: "Navigation target observed.",
        },
      ],
    ]);

    const plan = planGameplayRouteRuntimeEvidence({
      stall,
      routeAssessment,
      needs,
      dimension: "overworld",
      fulfilled,
    });

    expect(
      plan.instrumentation.some(
        (item) =>
          item.need === "entity-motion-series" ||
          item.need === "navigation-target",
      ),
    ).toBe(false);
    expect(plan.satisfied).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          need: "entity-motion-series",
          evidenceIds: ["route-a", "route-b"],
        }),
        expect.objectContaining({
          need: "navigation-target",
          evidenceIds: ["nav-1"],
        }),
      ]),
    );
  });
});
