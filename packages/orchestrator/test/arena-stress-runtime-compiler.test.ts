import { describe, expect, it } from "vitest";
import { buildMultiplayerStressMatrix } from "../../../packages/reliability/src/index.js";
import { compileArenaStressRuntime } from "../src/arena-stress-runtime-compiler.js";

describe("arena stress runtime compiler", () => {
  it("compiles supported scenarios and leaves unsupported scenarios explicit", () => {
    const matrix = buildMultiplayerStressMatrix({
      arenaIds: ["arena-1", "arena-2"],
      playersPerArena: 2,
    });

    const result = compileArenaStressRuntime({
      matrix,
      targetProfileFingerprint: "target",
      fixtureFingerprint: "fixture",
      objectiveId: "qa",
      participant: "result",
      arenaGenerations: {
        "arena-1": 1,
        "arena-2": 1,
      },
      subjects: {
        "arena-1:player-1": {
          playerKey: "arena-1:player-1",
          arenaId: "arena-1",
          arenaGeneration: 1,
          connectionGeneration: 1,
          participationGeneration: 1,
          lifeGeneration: 1,
        },
        "arena-2:player-1": {
          playerKey: "arena-2:player-1",
          arenaId: "arena-2",
          arenaGeneration: 1,
          connectionGeneration: 1,
          participationGeneration: 1,
          lifeGeneration: 1,
        },
      },
    });

    expect(
      result.runtimeReady.some(
        (item) =>
          item.kind === "full-capacity-session",
      ),
    ).toBe(true);
    expect(
      result.runtimeReady.some(
        (item) =>
          item.kind === "death-during-join",
      ),
    ).toBe(true);
    expect(
      result.manualRequired.some(
        (item) =>
          item.kind === "cleanup-start-overlap",
      ),
    ).toBe(true);
  });

  it("does not invent player generation identity", () => {
    const matrix = buildMultiplayerStressMatrix({
      arenaIds: ["arena-1"],
      playersPerArena: 1,
    });

    const result = compileArenaStressRuntime({
      matrix,
      targetProfileFingerprint: "target",
      fixtureFingerprint: "fixture",
      objectiveId: "qa",
      participant: "result",
      arenaGenerations: {
        "arena-1": 1,
      },
    });

    expect(
      result.manualRequired.some(
        (item) =>
          item.kind === "death-during-join",
      ),
    ).toBe(true);
  });
});
