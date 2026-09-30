import { describe, expect, it } from "vitest";
import {
  behaviorStateKey,
  type BehavioralWorldModel,
  type BehaviorPredicate,
  type BehaviorState,
} from "../../behavior-model/src/index.js";
import {
  boundedBehaviorSolver,
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

const safeMembership: BehaviorPredicate = {
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
  },
};

const model: BehavioralWorldModel = {
  schemaVersion: 1,
  id: "solver-test",
  variables: [],
  properties: [],
  transitions: [
    {
      id: "join",
      owner: "player",
      preconditions: [{
        kind: "condition",
        condition: {
          variableId: "arena.state",
          scopeKey: "arena:1",
          operator: "eq",
          value: "idle",
        },
      }],
      effects: [
        {
          kind: "set",
          variableId: "arena.members",
          scopeKey: "arena:1",
          value: 1,
        },
        {
          kind: "set",
          variableId: "arena.state",
          scopeKey: "arena:1",
          value: "active",
        },
      ],
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

describe("bounded behavior solver", () => {
  it("returns the shortest reachability witness", () => {
    const result = boundedBehaviorSolver.solve({
      id: "reach-active",
      model,
      initialState: initial,
      query: {
        id: "active-reachable",
        kind: "reachability",
        target: active,
      },
      budget: { maxDepth: 4, maxStates: 32 },
    });

    expect(result.disposition).toBe("proved");
    expect(result.proof.transitionIds).toEqual(["join"]);
    expect(result.trace?.length).toBe(2);
  });

  it("returns the shortest invariant counterexample", () => {
    const result = boundedBehaviorSolver.solve({
      id: "membership-invariant",
      model,
      initialState: initial,
      query: {
        id: "active-needs-membership",
        kind: "invariant",
        predicate: safeMembership,
      },
      budget: { maxDepth: 4, maxStates: 32 },
    });

    expect(result.disposition).toBe("disproved");
    expect(result.proof.transitionIds).toEqual([
      "join",
      "bad-cleanup",
    ]);
  });

  it("returns unknown rather than claiming safety when depth truncates search", () => {
    const result = boundedBehaviorSolver.solve({
      id: "truncated",
      model,
      initialState: initial,
      query: {
        id: "never-bad",
        kind: "invariant",
        predicate: safeMembership,
      },
      budget: { maxDepth: 1, maxStates: 32 },
    });

    expect(result.disposition).toBe("unknown");
    expect(result.proof.completeExploration).toBe(false);
  });

  it("proves an invariant only after exhaustive semantic-state exploration", () => {
    const safeModel: BehavioralWorldModel = {
      ...model,
      transitions: [model.transitions[0]!],
    };
    const result = boundedBehaviorSolver.solve({
      id: "exhaustive",
      model: safeModel,
      initialState: initial,
      query: {
        id: "active-needs-membership",
        kind: "invariant",
        predicate: safeMembership,
      },
      budget: { maxDepth: 4, maxStates: 32 },
    });

    expect(result.disposition).toBe("proved");
    expect(result.proof.completeExploration).toBe(true);
  });
});
