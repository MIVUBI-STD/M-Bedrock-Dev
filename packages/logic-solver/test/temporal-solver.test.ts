import { describe, expect, it } from "vitest";
import type {
  BehavioralWorldModel,
  BehaviorState,
} from "../../behavior-model/src/index.js";
import {
  solveTemporalProperty,
} from "../src/index.js";

const initial: BehaviorState = {
  schemaVersion: 1,
  tick: 0,
  values: {
    phase: "idle",
    cleanup: false,
  },
};

function model(
  transitions: BehavioralWorldModel["transitions"],
): BehavioralWorldModel {
  return {
    schemaVersion: 1,
    id: "temporal-test",
    variables: [],
    transitions,
    properties: [],
  };
}

const eventuallyCleanup = {
  id: "eventually-cleanup",
  kind: "eventually" as const,
  predicate: {
    kind: "condition" as const,
    condition: {
      variableId: "cleanup",
      operator: "eq" as const,
      value: true,
    },
  },
};

describe("temporal solver", () => {
  it("proves EVENTUALLY when every path reaches the target", () => {
    const result = solveTemporalProperty(
      model([{
        id: "cleanup",
        owner: "script",
        preconditions: [],
        effects: [{
          kind: "set",
          variableId: "cleanup",
          value: true,
        }],
      }]),
      initial,
      eventuallyCleanup,
      { maxDepth: 4, maxStates: 32 },
    );

    expect(result.disposition).toBe("proved");
    expect(result.proof.completeExploration).toBe(true);
  });

  it("finds a lasso counterexample for EVENTUALLY", () => {
    const result = solveTemporalProperty(
      model([{
        id: "spin",
        owner: "script",
        preconditions: [],
        effects: [{
          kind: "set",
          variableId: "phase",
          value: "idle",
        }],
      }]),
      initial,
      eventuallyCleanup,
      { maxDepth: 4, maxStates: 32 },
    );

    expect(result.disposition).toBe("disproved");
    expect(result.trace?.at(-1)?.viaTransitionId).toBe("spin");
  });

  it("disproves UNTIL when hold fails first", () => {
    const result = solveTemporalProperty(
      model([{
        id: "break-hold",
        owner: "script",
        preconditions: [],
        effects: [{
          kind: "set",
          variableId: "phase",
          value: "broken",
        }],
      }]),
      initial,
      {
        id: "idle-until-cleanup",
        kind: "until",
        hold: {
          kind: "condition",
          condition: {
            variableId: "phase",
            operator: "eq",
            value: "idle",
          },
        },
        until: eventuallyCleanup.predicate,
      },
      { maxDepth: 4, maxStates: 32 },
    );

    expect(result.disposition).toBe("disproved");
  });

  it("proves LEADS-TO on exhausted acyclic paths", () => {
    const lifecycle = model([
      {
        id: "finish",
        owner: "script",
        preconditions: [{
          kind: "condition",
          condition: {
            variableId: "phase",
            operator: "eq",
            value: "idle",
          },
        }],
        effects: [{
          kind: "set",
          variableId: "phase",
          value: "finished",
        }],
      },
      {
        id: "cleanup",
        owner: "script",
        preconditions: [{
          kind: "condition",
          condition: {
            variableId: "phase",
            operator: "eq",
            value: "finished",
          },
        }],
        effects: [{
          kind: "set",
          variableId: "cleanup",
          value: true,
        }],
      },
    ]);

    const result = solveTemporalProperty(
      lifecycle,
      initial,
      {
        id: "finish-leads-cleanup",
        kind: "leads-to",
        trigger: {
          kind: "condition",
          condition: {
            variableId: "phase",
            operator: "eq",
            value: "finished",
          },
        },
        consequence: eventuallyCleanup.predicate,
      },
      { maxDepth: 4, maxStates: 32 },
    );

    expect(result.disposition).toBe("proved");
  });

  it("returns UNKNOWN for unresolved cyclic LEADS-TO semantics", () => {
    const result = solveTemporalProperty(
      model([{
        id: "spin",
        owner: "script",
        preconditions: [],
        effects: [{
          kind: "set",
          variableId: "phase",
          value: "idle",
        }],
      }]),
      initial,
      {
        id: "idle-leads-cleanup",
        kind: "leads-to",
        trigger: {
          kind: "condition",
          condition: {
            variableId: "phase",
            operator: "eq",
            value: "idle",
          },
        },
        consequence: eventuallyCleanup.predicate,
      },
      { maxDepth: 4, maxStates: 32 },
    );

    expect(result.disposition).toBe("unknown");
  });
});
