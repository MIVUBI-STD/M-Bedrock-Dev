import type { SessionAction } from "./session-model.js";
import { runSessionSequence } from "./session-runner.js";

export interface TimedSessionAction {
  tick: number;
  action: SessionAction;
}

export interface TimedScenarioResult {
  orderedActions: TimedSessionAction[];
  sequence: ReturnType<typeof runSessionSequence>;
}

export function orderTimedActions(
  actions: readonly TimedSessionAction[],
): TimedSessionAction[] {
  return actions
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.tick - b.entry.tick || a.index - b.index)
    .map(({ entry }) => entry);
}

export function runTimedSessionScenario(
  arenaIds: readonly string[],
  actions: readonly TimedSessionAction[],
): TimedScenarioResult {
  const orderedActions = orderTimedActions(actions);
  return {
    orderedActions,
    sequence: runSessionSequence(
      arenaIds,
      orderedActions.map((entry) => entry.action),
    ),
  };
}

export function concurrentArenaStartScenario(
  offsetTicks: number,
): TimedSessionAction[] {
  return [
    { tick: 0, action: { kind: "join", playerId: "p1" } },
    { tick: 0, action: { kind: "join", playerId: "p2" } },
    { tick: 1, action: { kind: "assign", playerId: "p1", arenaId: "arena1" } },
    { tick: 1, action: { kind: "assign", playerId: "p2", arenaId: "arena2" } },
    { tick: 2, action: { kind: "start", playerId: "p1" } },
    { tick: 2 + offsetTicks, action: { kind: "start", playerId: "p2" } },
  ];
}
