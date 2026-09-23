import { describe, expect, it } from "vitest";
import { buildInvariantIntelligence } from "../src/invariant-intelligence.js";

describe("invariant intelligence orchestration", () => {
  it("never auto-promotes challenged candidates", () => {
    const good = Array.from({ length: 5 }, (_, index) => ({
      schemaVersion: 1 as const,
      tick: index,
      players: [{
        playerId: "p1",
        connected: true,
        arenaId: "arena1",
        phase: "starting" as const,
        progress: 0,
      }],
      arenas: [{
        arenaId: "arena1",
        activePlayerIds: ["p1"],
        cutsceneActive: true,
        round: 0,
      }],
    }));

    const result = buildInvariantIntelligence({
      knownGoodSnapshots: good,
      historicalFailureSnapshots: [{
        schemaVersion: 1,
        tick: 100,
        players: [{
          playerId: "p1",
          connected: true,
          arenaId: "arena1",
          phase: "playing",
          progress: 0,
        }],
        arenas: [{
          arenaId: "arena1",
          activePlayerIds: ["p1"],
          cutsceneActive: true,
          round: 0,
        }],
      }],
      options: {
        minAntecedentMatches: 3,
        minConfidence: 1,
      },
    });

    const cutscene = result.candidates.find((item) =>
      item.candidate.kind === "arena-cutscene-implies-starting-player",
    );
    expect(cutscene?.candidate.status).toBe("challenged");
    expect(cutscene?.promotion.eligible).toBe(false);
  });
});
