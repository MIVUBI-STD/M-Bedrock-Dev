import type { TimedSessionAction } from "../../reliability/src/index.js";
import type { MutationDescriptor } from "./mutation-types.js";

export interface TimedScenarioMutation {
  descriptor: MutationDescriptor;
  actions: TimedSessionAction[];
}

export function mutateTiming(
  actions: readonly TimedSessionAction[],
): TimedScenarioMutation[] {
  const mutations: TimedScenarioMutation[] = [];

  actions.forEach((entry, index) => {
    for (const delta of [-1, 1]) {
      const nextTick = entry.tick + delta;
      if (nextTick < 0) continue;
      const mutated = actions.map((item, itemIndex) =>
        itemIndex === index ? { ...item, tick: nextTick } : { ...item },
      );
      mutations.push({
        descriptor: {
          id: `timing-shift-${index}-${delta > 0 ? "plus" : "minus"}1`,
          operator: "timing-shift",
          domain: "state-concurrency",
          description: `Shift timed action ${index} by ${delta} tick.`,
        },
        actions: mutated,
      });
    }
  });

  return mutations;
}
