import { describe, expect, it } from "vitest";
import {
  adaptBedrockState,
  DEFAULT_ARENA_SESSION_MAPPING,
} from "../src/index.js";

describe("Bedrock scoreboard/tag observation adapter", () => {
  it("maps explicit tags and scores into runtime observations", () => {
    const result = adaptBedrockState(
      [{
        playerId: "p1",
        connected: true,
        tags: ["arena:arena1", "session:playing"],
        scores: {
          session_progress: 3,
        },
      }],
      [{
        arenaId: "arena1",
        tags: [],
        scores: {
          cutscene_active: 0,
          round: 2,
        },
      }],
      DEFAULT_ARENA_SESSION_MAPPING,
      {
        minecraftVersion: "1.26.40",
        tick: 100,
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.snapshot.players[0]).toMatchObject({
      playerId: "p1",
      arenaId: "arena1",
      phase: "playing",
      progress: 3,
    });
    expect(result.snapshot.arenas[0]).toMatchObject({
      arenaId: "arena1",
      activePlayerIds: ["p1"],
      cutsceneActive: false,
      round: 2,
    });
  });

  it("reports multiple arena tags as ambiguity instead of guessing", () => {
    const result = adaptBedrockState(
      [{
        playerId: "p1",
        connected: true,
        tags: ["arena:arena1", "arena:arena2", "session:playing"],
        scores: {},
      }],
      [],
      DEFAULT_ARENA_SESSION_MAPPING,
    );

    expect(result.snapshot.players[0]?.arenaId).toBeUndefined();
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "ambiguous",
        field: "arenaId",
      }),
    ]));
  });

  it("reports conflicting phase evidence as ambiguity", () => {
    const result = adaptBedrockState(
      [{
        playerId: "p1",
        connected: true,
        tags: ["session:starting", "session:playing"],
        scores: {},
      }],
      [],
      DEFAULT_ARENA_SESSION_MAPPING,
    );

    expect(result.snapshot.players[0]?.phase).toBeUndefined();
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "ambiguous",
        field: "phase",
      }),
    ]));
  });
});
