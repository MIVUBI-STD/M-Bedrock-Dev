import { describe, expect, it } from "vitest";
import { deriveArenaReplicaProofQuality } from "../src/arena-replica-proof-quality.js";

describe("arena replica proof quality", () => {
  it("keeps replica completeness independent", () => {
    const result = deriveArenaReplicaProofQuality(
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
        status: "incomplete",
        sampledBlocks: 80,
        requiredBlocks: 80,
        region: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 9, y: 0, z: 7 },
        },
        regions: [],
        regionSource: "topology-plan",
        replicas: [
          {
            arenaId: "arena-2",
            status: "verified",
            comparedBlocks: 80,
            unresolvedBlocks: 0,
            mismatches: [],
            mismatchCount: 0,
          },
          {
            arenaId: "arena-3",
            status: "incomplete",
            comparedBlocks: 60,
            unresolvedBlocks: 20,
            mismatches: [],
            mismatchCount: 0,
          },
        ],
      },
      undefined,
    );

    expect(result[0]).toMatchObject({
      arenaId: "arena-2",
      status: "bounded-proof",
      eligibleCoverageRatio: 1,
      effectiveArenaCoverageRatio: 0.8,
    });
    expect(result[1]).toMatchObject({
      arenaId: "arena-3",
      status: "incomplete-proof",
      eligibleCoverageRatio: 0.75,
      effectiveArenaCoverageRatio: 0.6,
    });
  });

  it("never hides a divergence behind incomplete aggregate evidence", () => {
    const result = deriveArenaReplicaProofQuality(
      undefined,
      {
        status: "diverged",
        sampledBlocks: 10,
        requiredBlocks: 10,
        region: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 9, y: 0, z: 0 },
        },
        regions: [],
        regionSource: "topology-plan",
        replicas: [{
          arenaId: "arena-2",
          status: "diverged",
          comparedBlocks: 10,
          unresolvedBlocks: 0,
          mismatches: [],
          mismatchCount: 2,
        }],
      },
      undefined,
    );

    expect(result[0]?.status).toBe("diverged");
    expect(result[0]?.mismatchCount).toBe(2);
  });
});
