import { concurrentArenaStartScenario } from "./timing-scenarios.js";
import type { LiveRegressionScenario } from "./live-regression-runner.js";

export function multiArenaCutsceneQueueScenario(
  offsetTicks: number,
): LiveRegressionScenario {
  if (!Number.isInteger(offsetTicks) || offsetTicks < 0 || offsetTicks > 2) {
    throw new Error("Cutscene queue scenario offset must be an integer from 0 to 2 ticks.");
  }

  return {
    id: `reg_multi_arena_cutscene_queue_offset_${offsetTicks}`,
    title: `Multi-arena cutscene independence with ${offsetTicks}-tick start offset`,
    arenaIds: ["arena1", "arena2"],
    actions: concurrentArenaStartScenario(offsetTicks),
  };
}
