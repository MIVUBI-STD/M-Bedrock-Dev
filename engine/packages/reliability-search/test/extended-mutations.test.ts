import { describe, expect, it } from "vitest";
import {
  mutateFunctionReference,
  mutateScoreboardObjective,
  mutateTagFilterOmission,
  mutateTiming,
} from "../src/index.js";

describe("extended Bedrock mutation operators", () => {
  it("redirects function references", () => {
    expect(mutateFunctionReference("function game/start")[0]?.mutated)
      .toContain("__mutation_missing__/game/start");
  });

  it("substitutes scoreboard objectives", () => {
    expect(
      mutateScoreboardObjective("scoreboard players set @s stage 1")[0]?.mutated,
    ).toContain("__mutation_missing__stage");
  });

  it("removes tag filters while preserving other selector filters", () => {
    expect(
      mutateTagFilterOmission("@a[tag=arena1,scores={stage=1..}]")[0]?.mutated,
    ).toContain("@a[scores={stage=1..}]");
  });

  it("shifts timed actions by one tick without creating negative ticks", () => {
    const mutations = mutateTiming([
      { tick: 0, action: { kind: "join", playerId: "p1" } },
      { tick: 2, action: { kind: "start", playerId: "p1" } },
    ]);

    expect(mutations.some((item) => item.actions[1]?.tick === 1)).toBe(true);
    expect(mutations.some((item) => item.actions[1]?.tick === 3)).toBe(true);
    expect(mutations.every((item) =>
      item.actions.every((entry) => entry.tick >= 0),
    )).toBe(true);
  });
});
