import { describe, expect, it } from "vitest";
import {
  buildMultiplayerStressMatrix,
} from "../../../reliability/src/index.js";
import {
  compileArenaInterleavingPortfolio,
} from "../../src/arena/arena-interleaving-portfolio.js";

describe("arena interleaving portfolio", () => {
  it("reuses the canonical stress matrix without creating a second scenario catalog", () => {
    const matrix = buildMultiplayerStressMatrix({
      arenaIds: ["arena-1", "arena-2"],
      playersPerArena: 2,
    });

    const subjects = Object.fromEntries(
      matrix.scenarios
        .flatMap((scenario) => scenario.playerIds)
        .filter(
          (value, index, array) =>
            array.indexOf(value) === index,
        )
        .map((playerId) => {
          const arenaId =
            playerId.split(":player-")[0] ??
            "arena-1";
          return [
            playerId,
            {
              playerId,
              arenaId,
              arenaGeneration: 1,
              connectionGeneration: 1,
              participationGeneration: 1,
              lifeGeneration: 1,
            },
          ];
        }),
    );

    const result =
      compileArenaInterleavingPortfolio({
        matrix,
        arenaGenerations: {
          "arena-1": 1,
          "arena-2": 1,
        },
        subjects,
        maxSchedulesPerScenario: 16,
      });

    expect(result.scenarios).toBe(
      matrix.scenarios.length,
    );
    expect(result.analyzed).toBeGreaterThan(0);
    expect(
      result.analyzed +
        result.insufficientIdentity +
        result.unsupported,
    ).toBe(result.scenarios);
  });
});
