import { describe, expect, it } from "vitest";
import {
  compareRuntimeObservation,
  runSessionSequence,
  validateRuntimeObservation,
} from "../src/index.js";

describe("runtime observation contract", () => {
  it("accepts a runtime snapshot matching the expected model", () => {
    const expected = runSessionSequence(
      ["arena1", "arena2"],
      [
        { kind: "join", playerId: "p1" },
        { kind: "join", playerId: "p2" },
        { kind: "assign", playerId: "p1", arenaId: "arena1" },
        { kind: "assign", playerId: "p2", arenaId: "arena2" },
        { kind: "start", playerId: "p1" },
        { kind: "start", playerId: "p2" },
      ],
    ).finalModel;

    const snapshot = {
      schemaVersion: 1 as const,
      players: [
        { playerId: "p1", connected: true, arenaId: "arena1", phase: "starting" as const, progress: 0 },
        { playerId: "p2", connected: true, arenaId: "arena2", phase: "starting" as const, progress: 0 },
      ],
      arenas: [
        { arenaId: "arena1", activePlayerIds: ["p1"], cutsceneActive: true, round: 0 },
        { arenaId: "arena2", activePlayerIds: ["p2"], cutsceneActive: true, round: 0 },
      ],
    };

    expect(validateRuntimeObservation(snapshot)).toEqual([]);
    expect(compareRuntimeObservation(expected, snapshot)).toMatchObject({
      ok: true,
      divergences: [],
      invariantViolations: [],
    });
  });

  it("reports runtime/model divergence without hiding unknown evidence", () => {
    const expected = runSessionSequence(
      ["arena1"],
      [
        { kind: "join", playerId: "p1" },
        { kind: "assign", playerId: "p1", arenaId: "arena1" },
        { kind: "start", playerId: "p1" },
      ],
    ).finalModel;

    const result = compareRuntimeObservation(expected, {
      schemaVersion: 1,
      players: [
        { playerId: "p1", connected: true, arenaId: "arena1" },
      ],
      arenas: [
        { arenaId: "arena1" },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.unknowns).toEqual(expect.arrayContaining([
      "player:p1:phase-inferred",
      "player:p1:progress-unknown",
      "arena:arena1:membership-unknown",
      "arena:arena1:cutscene-unknown",
      "arena:arena1:round-unknown",
    ]));
    expect(result.divergences.length).toBeGreaterThan(0);
  });
});
