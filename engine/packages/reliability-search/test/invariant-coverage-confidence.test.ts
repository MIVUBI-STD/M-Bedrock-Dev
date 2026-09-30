import { describe, expect, it } from "vitest";
import { mineInvariantEvidence } from "../src/index.js";

function snapshot(tick: number) {
  return {
    schemaVersion: 1 as const,
    tick,
    minecraftVersion: "1.26.40",
    players: [{
      playerId: "p1",
      connected: true,
      arenaId: "arena1",
      phase: "starting" as const,
      progress: tick,
    }],
    arenas: [{
      arenaId: "arena1",
      activePlayerIds: ["p1"],
      cutsceneActive: true,
      round: 0,
    }],
  };
}

describe("invariant coverage confidence", () => {
  it("does not turn state diversity into fake coverage diversity when coverage is absent", () => {
    const result = mineInvariantEvidence(
      [snapshot(1), snapshot(2), snapshot(3), snapshot(4)].map((item) => ({
        snapshot: item,
        mapId: "map-a",
      })),
      {
        minAntecedentMatches: 2,
        minConfidence: 1,
        minDistinctStates: 2,
        minDistinctCoverageBuckets: 2,
      },
    );

    expect(result.distinctStates).toBeGreaterThan(1);
    expect(result.distinctCoverageBuckets).toBe(1);
    expect(result.candidates.some((item) => item.status === "supported")).toBe(false);
  });
});
