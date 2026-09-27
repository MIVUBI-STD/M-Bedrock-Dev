import { describe, expect, it } from "vitest";
import {
  assessGameplayIntentGrounding,
  evaluateGameplayOutcomeAdmissibility,
  evaluateGameplayPolicyPredicate,
  gameplayOutcomePolicyRequirements,
  planGameplayOutcomeRuntimeObservations,
  findNearestGameplayRoutePoint,
  projectGameplayRoutePoint,
  resolveGameplayRouteIndex,
  resolveGameplayRouteTarget,
  resolveGameplaySpatialContext,
  unresolvedGameplayPolicyOperands,
  validateGameplayIntentModel,
  type GameplayIntentModel,
} from "../src/index.js";

const model: GameplayIntentModel = {
  schemaVersion: 1,
  id: "builder-memory",
  evidence: [
    {
      id: "e:phase",
      origin: "source-code",
      locator: "scripts/game/countdown.js",
      summary: "Source defines observation before building.",
    },
    {
      id: "e:plot",
      origin: "source-code",
      locator: "scripts/game/geometry.js",
      summary: "Source defines an assigned build plot.",
    },
  ],
  nodes: [
    {
      id: "phase:observation",
      kind: "phase",
      label: "Observation",
      status: "authored",
      evidenceIds: ["e:phase"],
    },
    {
      id: "mechanic:plot-build",
      kind: "mechanic",
      label: "Build in assigned plot",
      status: "authored",
      evidenceIds: ["e:plot"],
    },
  ],
  edges: [
    {
      id: "edge:observation-before-build",
      from: "phase:observation",
      to: "mechanic:plot-build",
      kind: "requires",
      status: "authored",
      evidenceIds: ["e:phase"],
    },
  ],
  invariants: [
    {
      id: "inv:plot-only",
      statement: "Player building is scoped to the assigned plot.",
      strength: "must",
      status: "authored",
      subjectIds: ["mechanic:plot-build"],
      evidenceIds: ["e:plot"],
    },
  ],
  unknowns: [],
};

describe("gameplay intent", () => {
  it("validates evidence-grounded graph references", () => {
    expect(validateGameplayIntentModel(model)).toEqual([]);
  });

  it("reports grounded subjects when no open intent question blocks them", () => {
    expect(
      assessGameplayIntentGrounding(
        model,
        ["mechanic:plot-build"],
      ).disposition,
    ).toBe("grounded");
  });

  it("evaluates structured policy predicates deterministically", () => {
    expect(
      evaluateGameplayPolicyPredicate(
        {
          kind: "truthy",
          operand: {
            kind: "path",
            path: "state.pendingCleanup",
          },
        },
        {
          state: {
            pendingCleanup: true,
            phase: "active",
          },
        },
      ),
    ).toBe("satisfied");

    expect(
      evaluateGameplayPolicyPredicate(
        {
          kind: "comparison",
          operator: "eq",
          left: {
            kind: "path",
            path: "state.phase",
          },
          right: {
            kind: "literal",
            value: "active",
          },
        },
        {
          state: {
            phase: "countdown",
          },
        },
      ),
    ).toBe("violated");

    expect(
      evaluateGameplayPolicyPredicate(
        {
          kind: "comparison",
          operator: "neq",
          left: {
            kind: "path",
            path: "record.generation",
          },
          right: {
            kind: "path",
            path: "session.generation",
          },
        },
        {
          record: {
            generation: 3,
          },
          session: {
            generation: 4,
          },
        },
      ),
    ).toBe("satisfied");

    expect(
      evaluateGameplayPolicyPredicate(
        {
          kind: "in",
          operand: {
            kind: "path",
            path: "state.phase",
          },
          values: [
            "countdown",
            "preparing",
            "resetting",
            "cinematic",
          ],
        },
        {
          state: {
            phase: "preparing",
          },
        },
      ),
    ).toBe("satisfied");

    expect(
      evaluateGameplayPolicyPredicate(
        {
          kind: "fallback",
          excludedPredicates: [
            {
              kind: "comparison",
              operator: "eq",
              left: {
                kind: "path",
                path: "state.phase",
              },
              right: {
                kind: "literal",
                value: "active",
              },
            },
            {
              kind: "in",
              operand: {
                kind: "path",
                path: "state.phase",
              },
              values: ["countdown", "preparing"],
            },
          ],
        },
        {
          state: {
            phase: "finishing",
          },
        },
      ),
    ).toBe("satisfied");

    expect(
      evaluateGameplayPolicyPredicate(
        {
          kind: "truthy",
          operand: {
            kind: "path",
            path: "missing.value",
          },
        },
        {},
      ),
    ).toBe("unknown");
  });

  it("evaluates indexed policy operands from runtime state", () => {
    const predicate = {
      kind: "falsy" as const,
      operand: {
        kind: "index" as const,
        base: {
          kind: "path" as const,
          path: "session.roster",
        },
        key: {
          kind: "path" as const,
          path: "record.playerId",
        },
      },
    };

    expect(
      evaluateGameplayPolicyPredicate(
        predicate,
        {
          record: { playerId: "player-a" },
          session: {
            roster: {
              "player-a": true,
            },
          },
        },
      ),
    ).toBe("violated");

    expect(
      evaluateGameplayPolicyPredicate(
        predicate,
        {
          record: { playerId: "player-a" },
          session: {
            roster: {
              "player-a": false,
            },
          },
        },
      ),
    ).toBe("satisfied");

    expect(
      evaluateGameplayPolicyPredicate(
        predicate,
        {
          record: { playerId: "player-b" },
          session: {
            roster: {
              "player-a": true,
            },
          },
        },
      ),
    ).toBe("unknown");
  });

  it("reports exact unresolved runtime policy operands", () => {
    const predicate = {
      kind: "all" as const,
      predicates: [
        {
          kind: "comparison" as const,
          operator: "neq" as const,
          left: {
            kind: "path" as const,
            path: "record.generation",
          },
          right: {
            kind: "path" as const,
            path: "session.generation",
          },
        },
        {
          kind: "falsy" as const,
          operand: {
            kind: "index" as const,
            base: {
              kind: "path" as const,
              path: "session.roster",
            },
            key: {
              kind: "path" as const,
              path: "record.playerId",
            },
          },
        },
      ],
    };

    const unresolved = unresolvedGameplayPolicyOperands(
      predicate,
      {
        record: {
          generation: 4,
          playerId: "player-a",
        },
      },
    );

    expect(unresolved).toEqual(expect.arrayContaining([
      {
        kind: "path",
        path: "session.generation",
      },
      {
        kind: "index",
        base: {
          kind: "path",
          path: "session.roster",
        },
        key: {
          kind: "path",
          path: "record.playerId",
        },
      },
    ]));
  });

  it("lists policy requirements for targeted runtime observation", () => {
    const policyModel: GameplayIntentModel = {
      schemaVersion: 1,
      id: "requirements",
      evidence: [{
        id: "e:policy",
        origin: "source-code",
        locator: "recovery-policy.ts",
        summary: "Recovery guard.",
      }],
      nodes: [
        {
          id: "outcome:resume",
          kind: "outcome",
          label: "Resume",
          status: "authored",
          evidenceIds: ["e:policy"],
        },
        {
          id: "policy:active",
          kind: "policy",
          label: "Active phase",
          status: "authored",
          evidenceIds: ["e:policy"],
          policyPredicate: {
            kind: "comparison",
            operator: "eq",
            left: {
              kind: "path",
              path: "session.phase",
            },
            right: {
              kind: "literal",
              value: "active",
            },
          },
        },
      ],
      edges: [{
        id: "edge:resume-active",
        from: "outcome:resume",
        to: "policy:active",
        kind: "requires",
        status: "authored",
        evidenceIds: ["e:policy"],
      }],
      invariants: [],
      unknowns: [],
    };

    expect(
      gameplayOutcomePolicyRequirements(
        policyModel,
        "outcome:resume",
      ),
    ).toEqual([
      expect.objectContaining({
        policyId: "policy:active",
        operands: [{
          kind: "path",
          path: "session.phase",
        }],
      }),
    ]);
  });

  it("plans concrete and deferred runtime observations for missing policy state", () => {
    const policyModel: GameplayIntentModel = {
      schemaVersion: 1,
      id: "runtime-needs",
      evidence: [{
        id: "e:policy",
        origin: "source-code",
        locator: "recovery-policy.ts",
        summary: "Membership and phase guards.",
      }],
      nodes: [
        {
          id: "outcome:cleanup",
          kind: "outcome",
          label: "Cleanup",
          status: "authored",
          evidenceIds: ["e:policy"],
        },
        {
          id: "policy:membership",
          kind: "policy",
          label: "Missing membership",
          status: "authored",
          evidenceIds: ["e:policy"],
          policyPredicate: {
            kind: "falsy",
            operand: {
              kind: "index",
              base: {
                kind: "path",
                path: "session.roster",
              },
              key: {
                kind: "path",
                path: "record.playerId",
              },
            },
          },
        },
      ],
      edges: [{
        id: "edge:membership",
        from: "outcome:cleanup",
        to: "policy:membership",
        kind: "requires",
        status: "authored",
        evidenceIds: ["e:policy"],
      }],
      invariants: [],
      unknowns: [],
    };

    expect(
      planGameplayOutcomeRuntimeObservations(
        policyModel,
        "outcome:cleanup",
        {
          record: {
            playerId: "player-a",
          },
        },
      ),
    ).toEqual([
      expect.objectContaining({
        policyId: "policy:membership",
        expression:
          "session.roster[record.playerId]",
        paths: ["session.roster.player-a"],
        deferred: false,
      }),
    ]);

    expect(
      planGameplayOutcomeRuntimeObservations(
        policyModel,
        "outcome:cleanup",
        {},
      ),
    ).toEqual([
      expect.objectContaining({
        expression:
          "session.roster[record.playerId]",
        paths: ["record.playerId"],
        deferred: true,
      }),
    ]);
  });

  it("evaluates outcome admissibility across authored policy guards", () => {
    const policyModel: GameplayIntentModel = {
      schemaVersion: 1,
      id: "reconnect-policy",
      evidence: [{
        id: "e:policy",
        origin: "source-code",
        locator: "src/recovery-policy.ts",
        summary: "Direct guarded cleanup outcome.",
      }],
      nodes: [
        {
          id: "outcome:cleanup",
          kind: "outcome",
          label: "Cleanup",
          status: "authored",
          evidenceIds: ["e:policy"],
        },
        {
          id: "policy:pending-cleanup",
          kind: "policy",
          label: "Pending Cleanup",
          status: "authored",
          evidenceIds: ["e:policy"],
          policyPredicate: {
            kind: "truthy",
            operand: {
              kind: "path",
              path: "state.pendingCleanup",
            },
          },
        },
      ],
      edges: [{
        id: "edge:cleanup-policy",
        from: "outcome:cleanup",
        to: "policy:pending-cleanup",
        kind: "requires",
        status: "authored",
        evidenceIds: ["e:policy"],
      }],
      invariants: [{
        id: "inv:cleanup-policy",
        statement: "Cleanup is admissible only under known guards.",
        strength: "must",
        status: "inferred",
        subjectIds: ["outcome:cleanup"],
        evidenceIds: ["e:policy"],
      }],
      unknowns: [],
    };

    expect(
      evaluateGameplayOutcomeAdmissibility(
        policyModel,
        "outcome:cleanup",
        { state: { pendingCleanup: true } },
      ).disposition,
    ).toBe("admissible");

    expect(
      evaluateGameplayOutcomeAdmissibility(
        policyModel,
        "outcome:cleanup",
        { state: { pendingCleanup: false } },
      ).disposition,
    ).toBe("inadmissible");

    expect(
      evaluateGameplayOutcomeAdmissibility(
        {
          ...policyModel,
          unknowns: [{
            id: "unknown:coverage",
            question: "Other cleanup branches are unresolved.",
            blockedSubjectIds: ["outcome:cleanup"],
          }],
        },
        "outcome:cleanup",
        { state: { pendingCleanup: false } },
      ).disposition,
    ).toBe("unknown");
  });

  it("resolves route-index ambiguity without guessing", () => {
    const routeModel: GameplayIntentModel = {
      schemaVersion: 1,
      id: "routes",
      evidence: [{
        id: "e:routes",
        origin: "source-code",
        locator: "scripts/routes.js",
        summary: "Authored route points.",
      }],
      nodes: [
        {
          id: "spatial-region:route-main",
          kind: "spatial-region",
          label: "Route Main",
          status: "authored",
          evidenceIds: ["e:routes"],
          spatialProfile: {
            coordinateSpace: "unknown",
            routeId: "main",
            points: [
              { x: 0, y: 0, z: 0, index: 9 },
            ],
            indexRanges: [{ min: 0, max: 18 }],
          },
        },
        {
          id: "spatial-region:route-bridge",
          kind: "spatial-region",
          label: "Route Bridge",
          status: "authored",
          evidenceIds: ["e:routes"],
          spatialProfile: {
            coordinateSpace: "unknown",
            routeId: "bridge",
            points: [
              { x: 1, y: 0, z: 0, index: 9 },
              { x: 2, y: 0, z: 0, index: 600 },
            ],
            indexRanges: [
              { min: 3, max: 13 },
              { min: 600, max: 610 },
            ],
          },
        },
        {
          id: "spatial-region:route-windmill",
          kind: "spatial-region",
          label: "Route Windmill",
          status: "authored",
          evidenceIds: ["e:routes"],
          spatialProfile: {
            coordinateSpace: "unknown",
            routeId: "windmill",
            points: [
              { x: 3, y: 0, z: 0, index: 9 },
            ],
            indexRanges: [
              { min: 6, max: 9 },
              { min: 500, max: 503 },
            ],
          },
        },
      ],
      edges: [],
      invariants: [],
      unknowns: [],
    };

    expect(
      resolveGameplayRouteIndex(routeModel, 9),
    ).toEqual({
      index: 9,
      disposition: "ambiguous",
      routeNodeIds: [
        "spatial-region:route-bridge",
        "spatial-region:route-main",
        "spatial-region:route-windmill",
      ],
      routeIds: ["bridge", "main", "windmill"],
    });

    expect(
      resolveGameplayRouteIndex(routeModel, 600),
    ).toEqual({
      index: 600,
      disposition: "unique",
      routeNodeIds: [
        "spatial-region:route-bridge",
      ],
      routeIds: ["bridge"],
    });

    expect(
      resolveGameplayRouteIndex(routeModel, 999),
    ).toEqual({
      index: 999,
      disposition: "unresolved",
      routeNodeIds: [],
      routeIds: [],
    });
  });

  it("projects local route points into authored arena world coordinates", () => {
    const routeModel: GameplayIntentModel = {
      schemaVersion: 1,
      id: "projected-routes",
      evidence: [{
        id: "e:route",
        origin: "source-code",
        locator: "scripts/main.js",
        summary: "Authored route + arena offset series.",
      }],
      nodes: [{
        id: "spatial-region:route-main",
        kind: "spatial-region",
        label: "Route Main",
        status: "authored",
        evidenceIds: ["e:route"],
        spatialProfile: {
          coordinateSpace: "local",
          routeId: "main",
          points: [
            {
              x: -17.5,
              y: -28.5,
              z: -110.5,
              index: 0,
            },
          ],
          indexRanges: [{ min: 0, max: 0 }],
          transform: {
            kind: "offset",
            offsetPath: "gameplayOffset",
            functionName: "applyOffset",
          },
          contextSeries: {
            collectionName: "arenas",
            contextCount: 6,
            offsetPath: "gameplayOffset",
            offsetBase: { x: 0, y: 0, z: 0 },
            offsetStride: { x: 351, y: 0, z: 0 },
            contextIdPrefix: "arena_",
            contextIdIndexBase: 1,
          },
        },
      }],
      edges: [],
      invariants: [],
      unknowns: [],
    };

    expect(
      resolveGameplaySpatialContext(
        routeModel,
        "spatial-region:route-main",
        "arena_3",
      ),
    ).toEqual({
      routeNodeId: "spatial-region:route-main",
      disposition: "resolved",
      contextIndex: 2,
      contextId: "arena_3",
    });

    expect(
      projectGameplayRoutePoint(
        routeModel,
        "spatial-region:route-main",
        0,
        "arena_3",
      ),
    ).toEqual({
      routeNodeId: "spatial-region:route-main",
      routeId: "main",
      routeIndex: 0,
      disposition: "resolved",
      contextIndex: 2,
      contextId: "arena_3",
      localPoint: {
        x: -17.5,
        y: -28.5,
        z: -110.5,
      },
      offset: {
        x: 702,
        y: 0,
        z: 0,
      },
      worldPoint: {
        x: 684.5,
        y: -28.5,
        z: -110.5,
      },
    });

    expect(
      projectGameplayRoutePoint(
        routeModel,
        "spatial-region:route-main",
        999,
        "arena_3",
      ).disposition,
    ).toBe("unresolved");
  });

  it("resolves route targets only when route context is sufficient", () => {
    const routeModel: GameplayIntentModel = {
      schemaVersion: 1,
      id: "route-targets",
      evidence: [{
        id: "e:route",
        origin: "source-code",
        locator: "scripts/main.js",
        summary: "Authored route targets.",
      }],
      nodes: [
        {
          id: "spatial-region:route-main",
          kind: "spatial-region",
          label: "Route Main",
          status: "authored",
          evidenceIds: ["e:route"],
          spatialProfile: {
            coordinateSpace: "local",
            routeId: "main",
            points: [{
              x: -66,
              y: -27.5,
              z: -26,
              index: 9,
            }],
            indexRanges: [{ min: 9, max: 9 }],
            transform: {
              kind: "offset",
              offsetPath: "gameplayOffset",
              functionName: "M",
            },
            contextSeries: {
              collectionName: "arenas",
              contextCount: 6,
              offsetPath: "gameplayOffset",
              offsetBase: { x: 0, y: 0, z: 0 },
              offsetStride: { x: 351, y: 0, z: 0 },
              contextIdPrefix: "arena_",
              contextIdIndexBase: 1,
            },
          },
        },
        {
          id: "spatial-region:route-bridge",
          kind: "spatial-region",
          label: "Route Bridge",
          status: "authored",
          evidenceIds: ["e:route"],
          spatialProfile: {
            coordinateSpace: "local",
            routeId: "bridge",
            points: [
              {
                x: 30,
                y: -28.5,
                z: -4,
                index: 9,
              },
              {
                x: 23,
                y: -28.5,
                z: 0.5,
                index: 606,
              },
            ],
            indexRanges: [
              { min: 9, max: 9 },
              { min: 606, max: 606 },
            ],
            transform: {
              kind: "offset",
              offsetPath: "gameplayOffset",
              functionName: "M",
            },
            contextSeries: {
              collectionName: "arenas",
              contextCount: 6,
              offsetPath: "gameplayOffset",
              offsetBase: { x: 0, y: 0, z: 0 },
              offsetStride: { x: 351, y: 0, z: 0 },
              contextIdPrefix: "arena_",
              contextIdIndexBase: 1,
            },
          },
        },
      ],
      edges: [],
      invariants: [],
      unknowns: [],
    };

    expect(
      resolveGameplayRouteTarget(
        routeModel,
        9,
        "arena_6",
      ).disposition,
    ).toBe("ambiguous");

    expect(
      resolveGameplayRouteTarget(
        routeModel,
        9,
        "arena_6",
        "bridge",
      ),
    ).toEqual({
      routeIndex: 9,
      disposition: "resolved",
      candidates: [{
        routeNodeId: "spatial-region:route-bridge",
        routeId: "bridge",
        routeIndex: 9,
        localPoint: {
          x: 30,
          y: -28.5,
          z: -4,
        },
        worldPoint: {
          x: 1785,
          y: -28.5,
          z: -4,
        },
      }],
    });

    const nearest = findNearestGameplayRoutePoint(
      routeModel,
      "arena_6",
      {
        x: 1778,
        y: -30,
        z: 0,
      },
      "bridge",
    );

    expect(nearest.disposition).toBe("resolved");
    expect(nearest.nearest).toEqual(
      expect.objectContaining({
        routeId: "bridge",
        routeIndex: 606,
        worldPoint: {
          x: 1778,
          y: -28.5,
          z: 0.5,
        },
      }),
    );
    expect(nearest.nearest?.distance).toBeCloseTo(
      Math.sqrt(2.5),
    );
  });

  it("blocks diagnosis when an open intent question affects the subject", () => {
    const ambiguous: GameplayIntentModel = {
      ...model,
      unknowns: [{
        id: "unknown:reconnect",
        question: "Should reconnect resume the same round?",
        blockedSubjectIds: ["mechanic:plot-build"],
      }],
    };

    expect(
      assessGameplayIntentGrounding(
        ambiguous,
        ["mechanic:plot-build"],
      ).disposition,
    ).toBe("ambiguous");
  });
});
