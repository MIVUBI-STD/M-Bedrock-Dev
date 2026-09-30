import { describe, expect, it } from "vitest";
import {
  compileArenaInterleavingAnalysis,
} from "../src/arena-interleaving-analysis.js";

describe("arena interleaving analysis", () => {
  it("compiles reconnect stress into generation-aware bounded schedules", () => {
    const result = compileArenaInterleavingAnalysis({
      scenario: {
        id: "reconnect",
        kind: "reconnect-after-disconnect",
        arenaIds: ["arena-1"],
        playerIds: ["p1"],
        invariants: [
          "arena.connection-generation-invalidates-stale-work",
        ],
        purpose: "Reconnect under a new generation.",
      },
      arenaGenerations: {
        "arena-1": 4,
      },
      subjects: {
        p1: {
          playerId: "p1",
          arenaId: "arena-1",
          arenaGeneration: 4,
          connectionGeneration: 7,
          participationGeneration: 3,
          lifeGeneration: 2,
        },
      },
      maxSchedules: 16,
    });

    expect(result.status).toBe("analyzed");
    expect(result.analysis?.generatedSchedules)
      .toBeGreaterThan(0);
    expect(
      result.analysis?.generationDependencyPairs,
    ).toBeGreaterThan(0);
  });

  it("requires explicit generation identity instead of inventing it", () => {
    const result = compileArenaInterleavingAnalysis({
      scenario: {
        id: "disconnect",
        kind: "disconnect-during-active",
        arenaIds: ["arena-1"],
        playerIds: ["p1"],
        invariants: [],
        purpose: "Disconnect during active play.",
      },
      arenaGenerations: {
        "arena-1": 2,
      },
    });

    expect(result.status).toBe(
      "insufficient-identity",
    );
    expect(result.analysis).toBeUndefined();
  });

  it("models cleanup/start overlap across two arenas", () => {
    const result = compileArenaInterleavingAnalysis({
      scenario: {
        id: "overlap",
        kind: "cleanup-start-overlap",
        arenaIds: ["arena-a", "arena-b"],
        playerIds: [],
        invariants: [
          "arena.cleanup-scope-isolation",
        ],
        purpose: "Overlap cleanup and start.",
      },
      arenaGenerations: {
        "arena-a": 8,
        "arena-b": 3,
      },
      maxSchedules: 32,
    });

    expect(result.status).toBe("analyzed");
    expect(
      result.analysis?.schedules.some(
        (schedule) =>
          schedule.riskReasons.includes(
            "cross-arena-overlap",
          ),
      ),
    ).toBe(true);
  });
});
