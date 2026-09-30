import { describe, expect, it } from "vitest";
import { proveArenaStructureInstances } from "../src/arena-structure-instance-proof.js";

describe("arena structure instance proof", () => {
  const layout = {
    basis: "topology" as const,
    canonical: {
      arenaId: "arena-1",
      anchor: { x: 0, y: 0, z: 0 },
    },
    replicas: [{
      arenaId: "arena-2",
      anchor: { x: 100, y: 0, z: 0 },
    }],
    offsets: [{ x: 100, y: 0, z: 0 }],
    confidence: "high" as const,
  };
  const plan = {
    volumes: [{
      min: { x: 0, y: 0, z: 0 },
      max: { x: 20, y: 20, z: 20 },
      evidenceCandidateIds: [],
    }],
    boundingBox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 20, y: 20, z: 20 },
    },
    totalBlocks: 9261,
    evidenceCandidates: 0,
    mergeGapBlocks: 0,
    confidence: "high" as const,
  };

  it("verifies translated structure instances with the same semantics", () => {
    const result = proveArenaStructureInstances(
      layout,
      plan,
      [
        {
          target: "arena/base",
          position: { x: 5, y: 0, z: 5 },
          options: { includeEntities: true },
          sourceKind: "command",
        },
        {
          target: "arena/base",
          position: { x: 105, y: 0, z: 5 },
          options: { includeEntities: true },
          sourceKind: "command",
        },
      ],
    );

    expect(result.status).toBe("verified");
    expect(result.replicas[0]?.mismatches).toEqual([]);
  });

  it("detects a different structure target in one replica", () => {
    const result = proveArenaStructureInstances(
      layout,
      plan,
      [
        {
          target: "arena/base",
          position: { x: 5, y: 0, z: 5 },
          sourceKind: "command",
        },
        {
          target: "arena/wrong",
          position: { x: 105, y: 0, z: 5 },
          sourceKind: "command",
        },
      ],
    );

    expect(result.status).toBe("diverged");
    expect(result.replicas[0]?.mismatches.length)
      .toBeGreaterThan(0);
  });
});
