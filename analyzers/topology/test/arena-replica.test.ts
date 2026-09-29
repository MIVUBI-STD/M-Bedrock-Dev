import { describe, expect, it } from "vitest";
import { compareArenaReplicas } from "../src/arena-replica.js";

describe("compareArenaReplicas", () => {
  it("accepts translated replicas with identical relative topology", () => {
    const result = compareArenaReplicas(
      {
        arenaId: "arena-1",
        anchor: { x: 100, y: 50, z: 100 },
        items: [
          { key: "spawn", signature: "player-spawn", position: { x: 102, y: 51, z: 100 } },
          { key: "flag", signature: "flag:v1", position: { x: 120, y: 50, z: 100 } },
        ],
      },
      {
        arenaId: "arena-2",
        anchor: { x: 100, y: 50, z: -400 },
        items: [
          { key: "spawn", signature: "player-spawn", position: { x: 102, y: 51, z: -400 } },
          { key: "flag", signature: "flag:v1", position: { x: 120, y: 50, z: -400 } },
        ],
      },
    );

    expect(result.ok).toBe(true);
    expect(result.translation).toEqual({ x: 0, y: 0, z: -500 });
  });

  it("reports semantic and coordinate drift independently", () => {
    const result = compareArenaReplicas(
      {
        arenaId: "canonical",
        anchor: { x: 0, y: 0, z: 0 },
        items: [
          { key: "gate", signature: "gate:v2", position: { x: 10, y: 0, z: 0 } },
        ],
      },
      {
        arenaId: "replica",
        anchor: { x: 100, y: 0, z: 0 },
        items: [
          { key: "gate", signature: "gate:v1", position: { x: 111, y: 0, z: 0 } },
        ],
      },
    );

    expect(result.ok).toBe(false);
    expect(result.mismatches.map((item) => item.kind).sort()).toEqual([
      "relative-position-mismatch",
      "signature-mismatch",
    ]);
  });
});
