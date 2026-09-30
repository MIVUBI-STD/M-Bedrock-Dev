import { describe, expect, it } from "vitest";
import { deriveArenaRepeatedRunValidationPlan } from "../src/arena-repeated-run-validation.js";
import { compileArenaRepeatedRunRuntime } from "../src/arena-repeated-run-runtime-compiler.js";

describe("arena repeated-run runtime compiler", () => {
  it("compiles all 1/2/5/20 stages when arena generations and capacity are explicit", () => {
    const plan =
      deriveArenaRepeatedRunValidationPlan();

    const result =
      compileArenaRepeatedRunRuntime({
        plan,
        arenaIds: [
          "arena-1",
          "arena-2",
        ],
        arenaGenerations: {
          "arena-1": 1,
          "arena-2": 1,
        },
        playersPerArena: 5,
        targetProfileFingerprint:
          "target",
        fixtureFingerprint:
          "fixture",
        objectiveId: "qa",
        participant: "result",
      });

    expect(
      result.runtimeReady,
    ).toHaveLength(
      plan.stages.length,
    );
    expect(
      result.manualRequired,
    ).toEqual([]);
    expect(
      result.experiments.find(
        (item) =>
          item.id ===
          "arena-repeat:all-arenas:20",
      ),
    ).toBeDefined();
  });

  it("does not invent player capacity", () => {
    const result =
      compileArenaRepeatedRunRuntime({
        plan:
          deriveArenaRepeatedRunValidationPlan(
            [1],
          ),
        arenaIds: ["arena-1"],
        arenaGenerations: {
          "arena-1": 1,
        },
        targetProfileFingerprint:
          "target",
        fixtureFingerprint:
          "fixture",
        objectiveId: "qa",
        participant: "result",
      });

    expect(
      result.manualRequired,
    ).toHaveLength(2);
  });
});
