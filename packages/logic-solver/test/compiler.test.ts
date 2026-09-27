import { describe, expect, it } from "vitest";
import type {
  BehavioralWorldModel,
  BehaviorState,
} from "../../behavior-model/src/index.js";
import {
  behaviorStateKey,
  compileAndSolveBehaviorConstraints,
  compileBehaviorConstraints,
} from "../src/index.js";

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
  id: "compiler-test",
  variables: [],
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
      id: "impossible-start",
      owner: "script",
      preconditions: [{
        kind: "condition",
        condition: {
          variableId: "arena.members",
          scopeKey: "arena:1",
          operator: "gt",
          value: 5,
        },
      }],
      effects: [{
        kind: "set",
        variableId: "arena.state",
        scopeKey: "arena:1",
        value: "active",
      }],
    },
  ],
  properties: [
    {
      id: "active-needs-membership",
      kind: "always",
      predicate: {
        kind: "implies",
        if: {
          kind: "condition",
          condition: {
            variableId: "arena.state",
            scopeKey: "arena:1",
            operator: "eq",
            value: "active",
          },
        },
        then: {
          kind: "condition",
          condition: {
            variableId: "arena.members",
            scopeKey: "arena:1",
            operator: "gt",
            value: 0,
          },
        },
      },
    },
    {
      id: "eventually-idle",
      kind: "eventually",
      predicate: {
        kind: "condition",
        condition: {
          variableId: "arena.state",
          scopeKey: "arena:1",
          operator: "eq",
          value: "idle",
        },
      },
    },
  ],
};

describe("constraint compiler", () => {
  it("compiles always-properties and transition enablement without semantic name guessing", () => {
    const compilation = compileBehaviorConstraints(
      model,
      initial,
      { maxDepth: 4, maxStates: 32 },
    );

    expect(
      compilation.constraints.map((item) => item.id),
    ).toEqual([
      "property:active-needs-membership",
      "transition-enabled:join",
      "transition-enabled:impossible-start",
    ]);
    expect(compilation.unsupported).toEqual([]);
  });

  it("solves the compiled invariant and transition reachability batch", () => {
    const batch = compileAndSolveBehaviorConstraints(
      model,
      initial,
      { maxDepth: 4, maxStates: 32 },
    );

    const byId = new Map(
      batch.results.map((item) => [
        item.constraint.id,
        item.result,
      ]),
    );

    expect(
      byId.get("property:active-needs-membership")?.disposition,
    ).toBe("proved");
    expect(
      byId.get("transition-enabled:join")?.disposition,
    ).toBe("proved");
    expect(
      byId.get("transition-enabled:impossible-start")?.disposition,
    ).toBe("disproved");
    expect(batch.temporalResults).toEqual([
      expect.objectContaining({
        propertyId: "eventually-idle",
        disposition: "proved",
      }),
    ]);
  });
});
