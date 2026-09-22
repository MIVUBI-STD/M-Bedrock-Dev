import fc from "fast-check";
import type { TimedSessionAction } from "./timing-scenarios.js";

export interface CutsceneQueueScenario {
  startOffsetTicks: number;
  disturbance:
    | "none"
    | "p1-disconnect"
    | "p2-disconnect"
    | "arena1-reset"
    | "arena2-reset";
  disturbanceOffsetTicks: number;
  actions: TimedSessionAction[];
}

export function cutsceneQueueScenarioArbitrary(): fc.Arbitrary<CutsceneQueueScenario> {
  return fc.record({
    startOffsetTicks: fc.integer({ min: 0, max: 2 }),
    disturbance: fc.constantFrom(
      "none",
      "p1-disconnect",
      "p2-disconnect",
      "arena1-reset",
      "arena2-reset",
    ),
    disturbanceOffsetTicks: fc.integer({ min: 0, max: 3 }),
  }).map(({ startOffsetTicks, disturbance, disturbanceOffsetTicks }) => {
    const actions: TimedSessionAction[] = [
      { tick: 0, action: { kind: "join", playerId: "p1" } },
      { tick: 0, action: { kind: "join", playerId: "p2" } },
      { tick: 1, action: { kind: "assign", playerId: "p1", arenaId: "arena1" } },
      { tick: 1, action: { kind: "assign", playerId: "p2", arenaId: "arena2" } },
      { tick: 2, action: { kind: "start", playerId: "p1" } },
      { tick: 2 + startOffsetTicks, action: { kind: "start", playerId: "p2" } },
    ];

    const disturbanceTick = 2 + disturbanceOffsetTicks;

    if (disturbance === "p1-disconnect") {
      actions.push({
        tick: disturbanceTick,
        action: { kind: "disconnect", playerId: "p1" },
      });
    } else if (disturbance === "p2-disconnect") {
      actions.push({
        tick: disturbanceTick,
        action: { kind: "disconnect", playerId: "p2" },
      });
    } else if (disturbance === "arena1-reset") {
      actions.push({
        tick: disturbanceTick,
        action: { kind: "reset-arena", arenaId: "arena1" },
      });
    } else if (disturbance === "arena2-reset") {
      actions.push({
        tick: disturbanceTick,
        action: { kind: "reset-arena", arenaId: "arena2" },
      });
    }

    return {
      startOffsetTicks,
      disturbance,
      disturbanceOffsetTicks,
      actions,
    };
  });
}
