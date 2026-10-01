import { describe, expect, it } from "vitest";
import { reconcileArenaLayouts } from "../../src/arena/arena-layout-reconciliation.js";

describe("arena layout reconciliation", () => {
  const discovery = {
    canonical: {
      arenaId: "arena-1",
      anchor: { x: 0, y: 0, z: 0 },
      items: [],
    },
    replicas: [
      {
        arenaId: "arena-2",
        anchor: { x: 100, y: 0, z: 0 },
        items: [],
      },
    ],
    offsets: [{ x: 100, y: 0, z: 0 }],
    supportByOffset: { "100,0,0": 3 },
    confidence: "medium" as const,
    evidenceCandidates: 3,
  };

  it("confirms matching script and topology offsets", () => {
    const result = reconcileArenaLayouts(
      discovery,
      {
        mode: "absolute-centers",
        arenaCount: 2,
        canonicalAnchor: { x: 0, y: 0, z: 0 },
        offsets: [
          { x: 0, y: 0, z: 0 },
          { x: 100, y: 0, z: 0 },
        ],
        sourceNames: ["ARENA_CENTERS"],
      },
    );

    expect(result.status).toBe("consistent");
    expect(result.mismatchedOffsets).toEqual([]);
  });

  it("does not choose between conflicting layouts", () => {
    const result = reconcileArenaLayouts(
      discovery,
      {
        mode: "relative-offsets",
        arenaCount: 2,
        offsets: [
          { x: 0, y: 0, z: 0 },
          { x: 120, y: 0, z: 0 },
        ],
        sourceNames: ["ARENA_OFFSETS"],
      },
    );

    expect(result.status).toBe("conflict");
    expect(result.mismatchedOffsets).toEqual([
      "100,0,0",
      "120,0,0",
    ]);
  });
});
