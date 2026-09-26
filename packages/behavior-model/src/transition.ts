import {
  evaluateBehaviorCondition,
} from "./condition.js";
import type {
  BehaviorState,
  BehaviorTransition,
} from "./types.js";

export interface TransitionApplication {
  enabled: boolean;
  state: BehaviorState;
  changedVariables: readonly string[];
}

export function applyBehaviorTransition(
  state: BehaviorState,
  transition: BehaviorTransition,
  nextTick = state.tick + 1,
): TransitionApplication {
  if (
    !Number.isInteger(nextTick) ||
    nextTick < state.tick
  ) {
    throw new Error(
      "Behavior transition nextTick must be an integer >= current tick.",
    );
  }

  const enabled = transition.preconditions.every(
    (condition) =>
      evaluateBehaviorCondition(state, condition),
  );

  if (!enabled) {
    return {
      enabled: false,
      state,
      changedVariables: [],
    };
  }

  const values = { ...state.values };
  const changed = new Set<string>();

  for (const effect of transition.effects) {
    switch (effect.kind) {
      case "set":
        values[effect.variableId] = effect.value;
        changed.add(effect.variableId);
        break;
      case "delete":
        delete values[effect.variableId];
        changed.add(effect.variableId);
        break;
      case "increment": {
        const current = values[effect.variableId];
        if (typeof current !== "number") {
          throw new Error(
            "Increment effect requires numeric state: " +
              effect.variableId +
              ".",
          );
        }
        values[effect.variableId] =
          current + effect.amount;
        changed.add(effect.variableId);
        break;
      }
    }
  }

  return {
    enabled: true,
    state: {
      schemaVersion: 1,
      tick: nextTick,
      values,
    },
    changedVariables: [...changed].sort(),
  };
}
