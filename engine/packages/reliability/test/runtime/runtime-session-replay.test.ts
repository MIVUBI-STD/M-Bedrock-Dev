import { describe, expect, it } from "vitest";
import { compareRuntimeSessionRecordings, createRuntimeSessionRecording } from "../../src/index.js";

const plan = { schemaVersion: 1 as const, scenarioId: "demo", actions: [] };

describe("runtime session replay contract", () => {
  it("finds the first semantic observation divergence", () => {
    const expected = createRuntimeSessionRecording(plan, [
      { schemaVersion: 1, tick: 1, players: [], arenas: [] },
      { schemaVersion: 1, tick: 2, players: [{ playerId: "p", connected: true }], arenas: [] },
    ], "profile-a");
    const actual = createRuntimeSessionRecording(plan, [
      { schemaVersion: 1, tick: 1, players: [], arenas: [] },
      { schemaVersion: 1, tick: 2, players: [{ playerId: "p", connected: false }], arenas: [] },
    ], "profile-a");
    const comparison = compareRuntimeSessionRecordings(expected, actual);
    expect(comparison.status).toBe("diverged");
    expect(comparison.firstDivergence?.index).toBe(1);
  });

  it("refuses cross-profile equivalence", () => {
    const snapshots = [{ schemaVersion: 1 as const, tick: 1, players: [], arenas: [] }];
    const comparison = compareRuntimeSessionRecordings(
      createRuntimeSessionRecording(plan, snapshots, "profile-a"),
      createRuntimeSessionRecording(plan, snapshots, "profile-b"),
    );
    expect(comparison.status).toBe("incomplete");
  });
});
