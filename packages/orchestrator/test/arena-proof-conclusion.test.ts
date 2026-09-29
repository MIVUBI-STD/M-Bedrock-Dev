import { describe, expect, it } from "vitest";
import { concludeArenaProof } from "../src/arena-proof-conclusion.js";

describe("arena proof conclusion", () => {
  it("only emits complete-proof for full coverage plus verified voxel proof", () => {
    const result = concludeArenaProof(
      {
        status: "full",
        plannedBlocks: 100,
        proofBlocks: 100,
        excludedBlocks: 0,
        coverageRatio: 1,
        partitionTruncated: false,
        regions: { planned: 1, proof: 1 },
        roleBlocks: {
          static: 100,
          mutable: 0,
          mixed: 0,
          ignored: 0,
          unknown: 0,
        },
      },
      {
        status: "verified",
        sampledBlocks: 100,
        requiredBlocks: 100,
        region: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 9, y: 0, z: 9 },
        },
        regions: [{
          min: { x: 0, y: 0, z: 0 },
          max: { x: 9, y: 0, z: 9 },
        }],
        regionSource: "topology-plan",
        replicas: [],
      },
    );

    expect(result.conclusion).toBe("complete-proof");
  });

  it("keeps verified partial coverage explicitly bounded", () => {
    const result = concludeArenaProof(
      {
        status: "partial",
        plannedBlocks: 100,
        proofBlocks: 80,
        excludedBlocks: 20,
        coverageRatio: 0.8,
        partitionTruncated: false,
        regions: { planned: 1, proof: 2 },
        roleBlocks: {
          static: 80,
          mutable: 20,
          mixed: 0,
          ignored: 0,
          unknown: 0,
        },
      },
      {
        status: "verified",
        sampledBlocks: 80,
        requiredBlocks: 80,
        region: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 9, y: 0, z: 9 },
        },
        regions: [],
        regionSource: "topology-plan",
        replicas: [],
      },
    );

    expect(result.conclusion).toBe("bounded-proof");
  });
});
