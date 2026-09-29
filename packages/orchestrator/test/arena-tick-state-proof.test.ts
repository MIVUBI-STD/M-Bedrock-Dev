import { describe, expect, it } from "vitest";
import { proveArenaTickStateEquivalence } from "../src/arena-tick-state-proof.js";

const layout = {
  basis: "topology" as const,
  canonical: {
    arenaId: "arena-1",
    anchor: { x: 0, y: 0, z: 0 },
  },
  replicas: [{
    arenaId: "arena-2",
    anchor: { x: 32, y: 0, z: 0 },
  }],
  offsets: [{ x: 32, y: 0, z: 0 }],
  confidence: "high" as const,
};
const regionPlan = {
  volumes: [{
    min: { x: 0, y: 0, z: 0 },
    max: { x: 15, y: 15, z: 15 },
    evidenceCandidateIds: [],
  }],
  boundingBox: {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 15, y: 15, z: 15 },
  },
  totalBlocks: 4096,
  evidenceCandidates: 0,
  mergeGapBlocks: 0,
  confidence: "high" as const,
};

describe("arena queued tick state proof", () => {
  it("verifies translated queued-tick records", () => {
    const result = proveArenaTickStateEquivalence(
      layout,
      regionPlan,
      [
        {
          chunkX: 0,
          chunkZ: 0,
          dimensionId: 0,
          kind: "PendingTicks",
          valueHash: "same",
        },
        {
          chunkX: 2,
          chunkZ: 0,
          dimensionId: 0,
          kind: "PendingTicks",
          valueHash: "same",
        },
      ],
    );

    expect(result.status).toBe("verified");
    expect(result.replicas[0]?.matchesCanonical)
      .toBe(true);
  });

  it("fails closed when the native observation set is truncated", () => {
    const result = proveArenaTickStateEquivalence(
      layout,
      regionPlan,
      [],
      { observationsTruncated: true },
    );
    expect(result.status).toBe("incomplete");
  });

  it("does not claim raw tick equivalence for non chunk-aligned offsets", () => {
    const result = proveArenaTickStateEquivalence(
      {
        ...layout,
        replicas: [{
          arenaId: "arena-2",
          anchor: { x: 17, y: 0, z: 0 },
        }],
        offsets: [{ x: 17, y: 0, z: 0 }],
      },
      regionPlan,
      [],
    );
    expect(result.replicas[0]?.status)
      .toBe("incomplete");
  });
});
