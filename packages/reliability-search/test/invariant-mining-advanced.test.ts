import { describe, expect, it } from "vitest";
import {
  challengeMinedInvariants,
  mineRuntimeInvariants,
} from "../src/index.js";

function snapshot(
  tick: number,
  phase: "assigned" | "starting" | "playing",
  progress: number,
) {
  return {
    schemaVersion: 1 as const,
    tick,
    minecraftVersion: "1.26.40",
    players: [{
      playerId: "p1",
      connected: true,
      arenaId: "arena1",
      phase,
      progress,
      tags: ["arena:arena1", "role:runner"],
      scores: { stage: progress + 1 },
    }],
    arenas: [{
      arenaId: "arena1",
      activePlayerIds: ["p1"],
      cutsceneActive: phase === "starting",
      round: 1,
    }],
    entities: [{
      entityId: `z${tick}`,
      typeId: "minecraft:zombie",
      dimension: "overworld",
      arenaId: "arena1",
      tags: ["arena:arena1"],
      position: { x: tick, y: 10, z: 5 },
      alive: true,
    }],
  };
}

describe("advanced invariant mining", () => {
  it("does not treat repeated identical snapshots as independent support", () => {
    const repeated = Array.from({ length: 30 }, () => snapshot(1, "starting", 0));
    const result = mineRuntimeInvariants(repeated, {
      minAntecedentMatches: 20,
      minConfidence: 1,
      minDistinctStates: 3,
    });

    const cutscene = result.candidates.find((item) =>
      item.kind === "arena-cutscene-implies-starting-player",
    );
    expect(cutscene?.status).toBe("candidate");
    expect(cutscene?.support.distinctStates).toBe(1);
  });

  it("mines tag-score, entity arena and spatial candidates with diverse evidence", () => {
    const snapshots = [
      snapshot(1, "assigned", 0),
      snapshot(2, "starting", 0),
      snapshot(3, "playing", 1),
      snapshot(4, "playing", 2),
    ];

    const result = mineRuntimeInvariants(snapshots, {
      minAntecedentMatches: 2,
      minConfidence: 1,
      minDistinctStates: 2,
      tagScoreRelations: [{
        tag: "role:runner",
        objective: "stage",
        relation: "nonzero",
      }],
      arenaRegions: [{
        arenaId: "arena1",
        dimension: "overworld",
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 20, z: 10 },
      }],
    });

    expect(result.candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "player-tag-implies-score", status: "supported" }),
      expect.objectContaining({ kind: "entity-arena-tag-consistency", status: "supported" }),
      expect.objectContaining({ kind: "entity-within-arena-region", status: "supported" }),
      expect.objectContaining({ kind: "playing-progress-nondecreasing", status: "supported" }),
    ]));
  });

  it("marks a previously supported candidate stale on an unseen Minecraft version", () => {
    const result = mineRuntimeInvariants(
      [
        snapshot(1, "assigned", 0),
        snapshot(2, "starting", 0),
        snapshot(3, "playing", 1),
      ],
      {
        minAntecedentMatches: 2,
        minConfidence: 1,
        minDistinctStates: 2,
      },
    );

    const challenged = challengeMinedInvariants(result.candidates, {
      currentMinecraftVersion: "1.27.0",
    });

    expect(challenged.some((item) => item.status === "stale")).toBe(true);
  });
});
