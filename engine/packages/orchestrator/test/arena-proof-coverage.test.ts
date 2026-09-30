import { describe, expect, it } from "vitest";
import { deriveArenaProofCoverage } from "../src/arena-proof-coverage.js";

describe("arena proof coverage", () => {
  it("reports exact coverage after mutable subtraction", () => {
    const result = deriveArenaProofCoverage(
      {
        volumes: [{
          min: { x: 0, y: 0, z: 0 },
          max: { x: 9, y: 9, z: 9 },
          evidenceCandidateIds: ["arena"],
        }],
        boundingBox: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 9, y: 9, z: 9 },
        },
        totalBlocks: 1000,
        evidenceCandidates: 1,
        mergeGapBlocks: 0,
        confidence: "medium",
      },
      undefined,
      {
        volumes: [{
          min: { x: 0, y: 0, z: 0 },
          max: { x: 7, y: 9, z: 9 },
          evidenceCandidateIds: ["arena"],
        }],
        excludedBlocks: 200,
        partitionCount: 1,
        truncated: false,
      },
    );

    expect(result?.plannedBlocks).toBe(1000);
    expect(result?.proofBlocks).toBe(800);
    expect(result?.excludedBlocks).toBe(200);
    expect(result?.coverageRatio).toBe(0.8);
    expect(result?.status).toBe("partial");
  });

  it("marks zero proof volume as none", () => {
    const result = deriveArenaProofCoverage(
      {
        volumes: [{
          min: { x: 0, y: 0, z: 0 },
          max: { x: 0, y: 0, z: 0 },
          evidenceCandidateIds: [],
        }],
        boundingBox: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 0, y: 0, z: 0 },
        },
        totalBlocks: 1,
        evidenceCandidates: 0,
        mergeGapBlocks: 0,
        confidence: "low",
      },
      undefined,
      {
        volumes: [],
        excludedBlocks: 1,
        partitionCount: 0,
        truncated: false,
      },
    );

    expect(result?.status).toBe("none");
    expect(result?.coverageRatio).toBe(0);
  });
});
