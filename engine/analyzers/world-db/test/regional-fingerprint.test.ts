import { describe, expect, it } from "vitest";
import {
  createRegionalChunkFingerprint,
  translatedChunkRegion,
} from "../src/regional-fingerprint.js";

describe("regional chunk fingerprint", () => {
  it("compares translated arena regions without depending on absolute chunk coordinates", () => {
    const observations = [
      { chunkX: 0, chunkZ: 0, dimensionId: 0, kind: "SubChunkPrefix", valueHash: "a", subChunkIndex: 0 },
      { chunkX: 10, chunkZ: 0, dimensionId: 0, kind: "SubChunkPrefix", valueHash: "a", subChunkIndex: 0 },
    ];

    const a = createRegionalChunkFingerprint(
      observations,
      { minChunkX: 0, maxChunkX: 0, minChunkZ: 0, maxChunkZ: 0, dimensionId: 0 },
      { chunkX: 0, chunkZ: 0 },
    );
    const b = createRegionalChunkFingerprint(
      observations,
      { minChunkX: 10, maxChunkX: 10, minChunkZ: 0, maxChunkZ: 0, dimensionId: 0 },
      { chunkX: 10, chunkZ: 0 },
    );

    expect(a.hash).toBe(b.hash);
  });

  it("refuses lossy non-chunk-aligned translation for raw regional proof", () => {
    expect(
      translatedChunkRegion(
        { minChunkX: 0, maxChunkX: 1, minChunkZ: 0, maxChunkZ: 1 },
        { x: 17, z: 0 },
      ),
    ).toBeUndefined();
  });
});
