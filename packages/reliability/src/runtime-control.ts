import type { SessionAction } from "./session-model.js";
import type { TimedSessionAction } from "./timing-scenarios.js";

export type RuntimeControlAction =
  | { kind: "assign"; playerId: string; arenaId: string }
  | { kind: "start"; playerId: string }
  | { kind: "disconnect"; playerId: string }
  | { kind: "reconnect"; playerId: string }
  | { kind: "reset-arena"; arenaId: string };

export interface TimedRuntimeControlAction {
  tick: number;
  action: RuntimeControlAction;
}

export interface RuntimeControlPlan {
  schemaVersion: 1;
  scenarioId: string;
  actions: TimedRuntimeControlAction[];
}

export function toRuntimeControlAction(
  action: SessionAction,
): RuntimeControlAction | undefined {
  if (
    action.kind === "assign" ||
    action.kind === "start" ||
    action.kind === "disconnect" ||
    action.kind === "reconnect" ||
    action.kind === "reset-arena"
  ) {
    return action;
  }
  return undefined;
}

export function createRuntimeControlPlan(
  scenarioId: string,
  actions: readonly TimedSessionAction[],
): RuntimeControlPlan {
  return {
    schemaVersion: 1,
    scenarioId,
    actions: actions
      .map((entry) => {
        const action = toRuntimeControlAction(entry.action);
        return action ? { tick: entry.tick, action } : undefined;
      })
      .filter((entry): entry is TimedRuntimeControlAction => entry !== undefined),
  };
}
