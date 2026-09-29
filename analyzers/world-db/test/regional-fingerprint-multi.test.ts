import { describe, expect, it } from "vitest";
import {
  createRegionalChunkFingerprintFromRegions,
} from "../src/regional-fingerprint.js";

describe("multi-region chunk fingerprint", () => {
  it("ignores observations in gaps between evidence regions", () => {
    const observations = [
      { chunkX: 0, chunkZ: 0, dimensionId: 0, kind: "SubChunkPrefix", valueHash: "a" },
      { chunkX: 5, chunkZ: 0, dimensionId: 0, kind: "SubChunkPrefix", valueHash: "noise" },
      { chunkX: 10, chunkZ: 0, dimensionId: 0, kind: "SubChunkPrefix", valueHash: "b" },
    ];

    const result = createRegionalChunkFingerprintFromRegions(
      observations,
      [
        { minChunkX: 0, maxChunkX: 0, minChunkZ: 0, maxChunkZ: 0, dimensionId: 0 },
        { minChunkX: 10, maxChunkX: 10, minChunkZ: 0, maxChunkZ: 0, dimensionId: 0 },
      ],
      { chunkX: 0, chunkZ: 0 },
    );

    expect(result.records).toBe(2);
    expect(result.components.some((item) => item.valueHash === "noise")).toBe(false);
  });
});
