import { describe, expect, it } from "vitest";
import {
  behaviorStateKey,
  type BehavioralWorldModel,
  type BehaviorPredicate,
  type BehaviorState,
} from "../../behavior-model/src/index.js";
import type {
  ConstraintProblem,
  SolverResult,
} from "../../logic-solver/src/index.js";
import {
  minimizeInvariantCounterexample,
} from "../src/index.js";

const active: BehaviorPredicate = {
  kind: "condition",
  condition: {
    variableId: "arena.state",
    scopeKey: "arena:1",
    operator: "eq",
    value: "active",
  },
};

const invariant: BehaviorPredicate = {
  kind: "implies",
  if: active,
  then: {
    kind: "condition",
    condition: {
      variableId: "arena.members",
      scopeKey: "arena:1",
      operator: "gt",
      value: 0,
    },
  },
};

const initial: BehaviorState = {
  schemaVersion: 1,
  tick: 0,
  values: {
    [behaviorStateKey("arena.state", "arena:1")]: "idle",
    [behaviorStateKey("arena.members", "arena:1")]: 0,
    noise: false,
  },
};

const model: BehavioralWorldModel = {
  schemaVersion: 1,
  id: "minimize-test",
  variables: [],
  properties: [],
  transitions: [
    {
      id: "join",
      owner: "player",
      preconditions: [],
      effects: [
        {
          kind: "set",
          variableId: "arena.state",
          scopeKey: "arena:1",
          value: "active",
        },
        {
          kind: "set",
          variableId: "arena.members",
          scopeKey: "arena:1",
          value: 1,
        },
      ],
    },
    {
      id: "noise",
      owner: "script",
      preconditions: [],
      effects: [{
        kind: "set",
        variableId: "noise",
        value: true,
      }],
    },
    {
      id: "bad-cleanup",
      owner: "script",
      preconditions: [active],
      effects: [{
        kind: "set",
        variableId: "arena.members",
        scopeKey: "arena:1",
        value: 0,
      }],
    },
  ],
};

const problem: ConstraintProblem = {
  id: "problem",
  model,
  initialState: initial,
  query: {
    id: "membership",
    kind: "invariant",
    predicate: invariant,
  },
  budget: { maxDepth: 8, maxStates: 64 },
};

const result: SolverResult = {
  problemId: "problem",
  queryId: "membership",
  disposition: "disproved",
  reason: "fixture",
  proof: {
    completeExploration: false,
    transitionIds: ["join", "noise", "bad-cleanup"],
    exploredStates: 4,
    maxDepthReached: 3,
  },
  trace: [
    { depth: 0, state: initial },
    {
      depth: 1,
      viaTransitionId: "join",
      state: {
        schemaVersion: 1,
        tick: 1,
        values: {
          ...initial.values,
          [behaviorStateKey("arena.state", "arena:1")]: "active",
          [behaviorStateKey("arena.members", "arena:1")]: 1,
        },
      },
    },
    {
      depth: 2,
      viaTransitionId: "noise",
      state: {
        schemaVersion: 1,
        tick: 2,
        values: {
          ...initial.values,
          [behaviorStateKey("arena.state", "arena:1")]: "active",
          [behaviorStateKey("arena.members", "arena:1")]: 1,
          noise: true,
        },
      },
    },
    {
      depth: 3,
      viaTransitionId: "bad-cleanup",
      state: {
        schemaVersion: 1,
        tick: 3,
        values: {
          ...initial.values,
          [behaviorStateKey("arena.state", "arena:1")]: "active",
          [behaviorStateKey("arena.members", "arena:1")]: 0,
          noise: true,
        },
      },
    },
  ],
};

describe("logic counterexample minimizer", () => {
  it("removes irrelevant transitions while preserving the invariant violation", async () => {
    const minimized = await minimizeInvariantCounterexample(
      problem,
      result,
    );

    expect(minimized.transitionIds).toEqual([
      "join",
      "bad-cleanup",
    ]);
    expect(minimized.originalTransitions).toBe(3);
    expect(minimized.minimizedTransitions).toBe(2);
    expect(
      minimized.trace.at(-1)?.viaTransitionId,
    ).toBe("bad-cleanup");
  });
});
