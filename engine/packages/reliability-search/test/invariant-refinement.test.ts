import { describe, expect, it } from "vitest";
import {
  createInvariantRevalidationTasks,
  mineInvariantEvidence,
  summarizeCrossMapInvariantEvidence,
} from "../src/index.js";

function evidence(tick: number, mapId: string) {
  return {
    mapId,
    coverage: { features: [{ dimension: "interaction" as const, key: "bucket-" + tick }] },
    snapshot: {
      schemaVersion: 1 as const,
      tick,
      minecraftVersion: "1.26.40",
      players: [{
        playerId: "p1",
        connected: true,
        arenaId: "arena1",
        phase: tick % 2 ? "starting" as const : "playing" as const,
        progress: tick,
      }],
      arenas: [{
        arenaId: "arena1",
        activePlayerIds: ["p1"],
        cutsceneActive: tick % 2 === 1,
        round: tick % 3,
      }],
    },
  };
}

describe("invariant refinement", () => {
  it("requires coverage and map diversity", () => {
    const result = mineInvariantEvidence([
      evidence(1, "map-a"), evidence(2, "map-a"),
      evidence(3, "map-b"), evidence(4, "map-b"),
    ], {
      minAntecedentMatches: 2,
      minConfidence: 1,
      minDistinctStates: 2,
      minDistinctCoverageBuckets: 3,
      minDistinctMaps: 2,
    });

    expect(result.distinctMaps).toBe(2);
    expect(result.distinctCoverageBuckets).toBe(4);
    expect(result.candidates.some((item) => item.status === "supported")).toBe(true);
  });

  it("summarizes cross-map contradiction", () => {
    const base = {
      description: "x",
      minecraftVersions: ["1.26.40"],
      support: {
        observations: 5, distinctStates: 2, distinctCoverageBuckets: 2,
        distinctMaps: 1, distinctVersions: 1, antecedentMatches: 5,
        satisfied: 5, counterexamples: 0, confidence: 1,
      },
      evidence: [], counterexampleEvidence: [], challengeEvidence: [],
    };

    const summary = summarizeCrossMapInvariantEvidence([
      { mapId: "map-a", candidates: [{ ...base, id: "a", mapIds: ["map-a"], kind: "player-phase-implies-connected" as const, status: "supported" as const }] },
      { mapId: "map-b", candidates: [{ ...base, id: "b", mapIds: ["map-b"], kind: "player-phase-implies-connected" as const, status: "rejected" as const }] },
    ]);

    expect(summary[0]).toMatchObject({
      supportingMaps: ["map-a"],
      rejectedMaps: ["map-b"],
      totalMaps: 2,
    });
  });

  it("queues revalidation on related update delta", () => {
    const candidate = {
      id: "cutscene",
      kind: "arena-cutscene-implies-starting-player" as const,
      description: "x",
      minecraftVersions: ["1.26.30"],
      mapIds: ["map-a"],
      support: {
        observations: 20, distinctStates: 4, distinctCoverageBuckets: 4,
        distinctMaps: 1, distinctVersions: 1, antecedentMatches: 20,
        satisfied: 20, counterexamples: 0, confidence: 1,
      },
      status: "supported" as const,
      evidence: [], counterexampleEvidence: [], challengeEvidence: [],
    };
    const tasks = createInvariantRevalidationTasks([candidate], {
      fromVersion: "1.26.30",
      toVersion: "1.26.40",
      entries: [{
        id: "state-change",
        kind: "behavior-changed",
        domain: "multiplayer",
        capabilityTags: ["gameplay-state"],
        affectedIdentifiers: [],
        summary: "state behavior changed",
        source: "fixture",
        confidence: "documented",
      }],
    });

    expect(tasks[0]).toMatchObject({ candidateId: "cutscene", priority: "P0" });
  });
});
