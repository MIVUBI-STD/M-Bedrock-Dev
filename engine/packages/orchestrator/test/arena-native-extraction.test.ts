import { describe, expect, it } from "vitest";
import { auditArenaNativeSpatialContent } from "../src/arena-native-extraction.js";

describe("arena native spatial extraction", () => {
  const discovery = {
    canonical: {
      arenaId: "arena-1",
      anchor: { x: 0, y: 50, z: 0 },
      items: [{ key: "flag", signature: "flag", position: { x: 8, y: 50, z: 8 } }],
    },
    replicas: [
      {
        arenaId: "arena-2",
        anchor: { x: 160, y: 50, z: 0 },
        items: [{ key: "flag", signature: "flag", position: { x: 168, y: 50, z: 8 } }],
      },
    ],
    offsets: [{ x: 160, y: 0, z: 0 }],
    supportByOffset: { "160,0,0": 4 },
    confidence: "high",
    evidenceCandidates: 4,
  } as const;

  it("automatically proves chunk-aligned translated regions", () => {
    const result = auditArenaNativeSpatialContent(discovery, [
      { chunkX: 0, chunkZ: 0, dimensionId: 0, kind: "SubChunkPrefix", valueHash: "same", subChunkIndex: 0 },
      { chunkX: 10, chunkZ: 0, dimensionId: 0, kind: "SubChunkPrefix", valueHash: "same", subChunkIndex: 0 },
    ], { marginChunks: 0 });

    expect(result.replicas[0]?.status).toBe("chunk-record-proof");
    expect(result.replicas[0]?.matchesCanonical).toBe(true);
  });

  it("requires voxel proof when translation is not chunk aligned", () => {
    const result = auditArenaNativeSpatialContent(
      {
        ...discovery,
        replicas: [{ ...discovery.replicas[0], anchor: { x: 516, y: 50, z: 0 } }],
        offsets: [{ x: 516, y: 0, z: 0 }],
      },
      [{ chunkX: 0, chunkZ: 0, dimensionId: 0, kind: "SubChunkPrefix", valueHash: "a" }],
    );

    expect(result.status).toBe("voxel-proof-required");
  });
});
