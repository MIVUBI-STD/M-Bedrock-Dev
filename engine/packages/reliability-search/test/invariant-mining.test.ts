import { describe, expect, it } from "vitest";
import {
  challengeMinedInvariants,
  draftInvariantPromotion,
  mineRuntimeInvariants,
} from "../src/index.js";

function goodSnapshot(tick: number) {
  return {
    schemaVersion: 1 as const,
    tick,
    players: [
      {
        playerId: "p1",
        connected: true,
        arenaId: "arena1",
        phase: "starting" as const,
        progress: 0,
      },
    ],
    arenas: [
      {
        arenaId: "arena1",
        activePlayerIds: ["p1"],
        cutsceneActive: true,
        round: 0,
      },
    ],
  };
}

describe("dynamic invariant mining", () => {
  it("mines supported candidates only after minimum support is reached", () => {
    const result = mineRuntimeInvariants(
      Array.from({ length: 25 }, (_, index) => goodSnapshot(index)),
      {
        minAntecedentMatches: 20,
        minConfidence: 1,
        minDistinctStates: 1,
      },
    );

    const cutscene = result.candidates.find((item) =>
      item.kind === "arena-cutscene-implies-starting-player",
    );
    expect(cutscene).toMatchObject({
      status: "supported",
      support: {
        antecedentMatches: 25,
        counterexamples: 0,
        confidence: 1,
      },
    });
  });

  it("rejects a candidate contradicted by known-good evidence", () => {
    const snapshots = [
      goodSnapshot(1),
      {
        schemaVersion: 1 as const,
        tick: 2,
        players: [{
          playerId: "p1",
          connected: true,
          phase: "playing" as const,
          progress: 0,
        }],
        arenas: [],
      },
    ];

    const result = mineRuntimeInvariants(
      snapshots,
      { minAntecedentMatches: 1, minConfidence: 1, minDistinctStates: 1 },
    );

    expect(result.rejected.some((item) =>
      item.kind === "player-phase-implies-arena",
    )).toBe(true);
  });

  it("challenges supported candidates using historical failures and mutation survivors", () => {
    const mined = mineRuntimeInvariants(
      Array.from({ length: 3 }, (_, index) => goodSnapshot(index)),
      { minAntecedentMatches: 1, minConfidence: 1, minDistinctStates: 1 },
    );

    const challenged = challengeMinedInvariants(
      mined.candidates,
      {
        historicalFailures: [{
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
        campaignHistory: [{
          schemaVersion: 1,
          campaignId: "c1",
          createdAt: "2026-09-23T00:00:00Z",
          blindspotTasks: [],
          mutationReport: {
            total: 1,
            killed: 0,
            survived: 1,
            invalid: 0,
            score: 0,
            byDomain: {},
            results: [{
              descriptor: {
                id: "m1",
                operator: "shared-cutscene-lock",
                domain: "state-concurrency",
                description: "shared",
              },
              status: "survived",
            }],
          },
        }],
      },
    );

    const cutscene = challenged.find((item) =>
      item.kind === "arena-cutscene-implies-starting-player",
    );
    expect(cutscene?.status).toBe("challenged");
    expect(cutscene?.challengeEvidence.length).toBeGreaterThan(0);
    expect(draftInvariantPromotion(cutscene!).eligible).toBe(false);
  });
});
