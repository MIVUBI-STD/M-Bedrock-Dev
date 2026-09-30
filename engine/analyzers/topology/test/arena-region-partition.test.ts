import { describe, expect, it } from "vitest";
import {
  partitionArenaProofVolumes,
  subtractArenaRegionVolume,
} from "../src/arena-region-partition.js";

describe("arena region partitioning", () => {
  it("subtracts an internal mutable cuboid without losing the static shell", () => {
    const result = subtractArenaRegionVolume(
      {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 9, y: 9, z: 9 },
        evidenceCandidateIds: ["arena"],
      },
      {
        min: { x: 2, y: 2, z: 2 },
        max: { x: 7, y: 7, z: 7 },
        evidenceCandidateIds: ["mutable"],
      },
    );

    expect(result).toHaveLength(6);
    const remaining = result.reduce(
      (sum, item) =>
        sum +
        (item.max.x - item.min.x + 1) *
        (item.max.y - item.min.y + 1) *
        (item.max.z - item.min.z + 1),
      0,
    );
    expect(remaining).toBe(1000 - 216);
  });

  it("fails closed to original proof volumes when partition budget is exceeded", () => {
    const result = partitionArenaProofVolumes(
      [{
        min: { x: 0, y: 0, z: 0 },
        max: { x: 100, y: 100, z: 100 },
        evidenceCandidateIds: ["arena"],
      }],
      [
        {
          min: { x: 10, y: 10, z: 10 },
          max: { x: 20, y: 20, z: 20 },
          evidenceCandidateIds: [],
        },
        {
          min: { x: 30, y: 30, z: 30 },
          max: { x: 40, y: 40, z: 40 },
          evidenceCandidateIds: [],
        },
      ],
      { maxPartitions: 2 },
    );

    expect(result.truncated).toBe(true);
    expect(result.volumes).toHaveLength(1);
  });
});
