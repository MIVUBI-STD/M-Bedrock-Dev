import {
  evaluateBehaviorPredicate,
} from "./condition.js";
import {
  behaviorStateKey,
} from "./state-key.js";
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
    (predicate) =>
      evaluateBehaviorPredicate(state, predicate),
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
    const key = behaviorStateKey(
      effect.variableId,
      effect.scopeKey,
    );

    switch (effect.kind) {
      case "set":
        values[key] = effect.value;
        changed.add(key);
        break;
      case "delete":
        delete values[key];
        changed.add(key);
        break;
      case "increment": {
        const current = values[key];
        if (typeof current !== "number") {
          throw new Error(
            "Increment effect requires numeric state: " +
              key +
              ".",
          );
        }
        values[key] =
          current + effect.amount;
        changed.add(key);
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
