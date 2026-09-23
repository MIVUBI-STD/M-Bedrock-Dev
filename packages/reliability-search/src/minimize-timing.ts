import { ddmin } from "./minimize.js";
import type { TimedSessionAction } from "../../reliability/src/index.js";

export interface TimedScenarioMinimizeResult {
  actions: TimedSessionAction[];
  evaluations: number;
  originalLength: number;
  minimizedLength: number;
}

export async function minimizeTimedScenario(
  actions: readonly TimedSessionAction[],
  stillFails: (candidate: readonly TimedSessionAction[]) => boolean | Promise<boolean>,
): Promise<TimedScenarioMinimizeResult> {
  const result = await ddmin(actions, stillFails);

  let current = [...result.minimized];
  let evaluations = result.evaluations;

  for (let index = 0; index < current.length; index += 1) {
    const entry = current[index]!;
    if (entry.tick === 0) continue;

    const normalized = current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, tick: 0 } : item,
    );
    evaluations += 1;
    if (await stillFails(normalized)) {
      current = normalized;
    }
  }

  const minTick = Math.min(...current.map((entry) => entry.tick));
  if (Number.isFinite(minTick) && minTick > 0) {
    const shifted = current.map((entry) => ({
      ...entry,
      tick: entry.tick - minTick,
    }));
    evaluations += 1;
    if (await stillFails(shifted)) current = shifted;
  }

  current.sort((a, b) => a.tick - b.tick);

  return {
    actions: current,
    evaluations,
    originalLength: actions.length,
    minimizedLength: current.length,
  };
}
