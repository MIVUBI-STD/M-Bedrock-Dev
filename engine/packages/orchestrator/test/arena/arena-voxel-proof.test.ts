import { describe, expect, it } from "vitest";
import type { BedrockLevelDbReader } from "../../../../adapters/leveldb/src/index.js";
import { comp, int, string, writeUncompressed, type NBT } from "prismarine-nbt";
import { proveArenaVoxelEquivalence } from "../../src/arena/arena-voxel-proof.js";

function singleBlockSubchunk(name: string): Uint8Array {
  const palette = writeUncompressed(
    comp({
      name: string(name),
      states: comp({}),
      version: int(1),
    }, "") as NBT,
    "little",
  );
  return Buffer.concat([Buffer.from([9, 1, 0, 0]), palette]);
}

function reader(entries: Map<string, Uint8Array>): BedrockLevelDbReader {
  return {
    async get(key) {
      return entries.get(Buffer.from(key).toString("hex"));
    },
    async *entries() {},
    async close() {},
  };
}

function key(chunkX: number, chunkZ: number, subY: number): string {
  const bytes = Buffer.alloc(10);
  bytes.writeInt32LE(chunkX, 0);
  bytes.writeInt32LE(chunkZ, 4);
  bytes[8] = 47;
  bytes.writeInt8(subY, 9);
  return bytes.toString("hex");
}

describe("arena voxel proof", () => {
  it("compares non-chunk-aligned replicas by exact world coordinate", async () => {
    const db = new Map<string, Uint8Array>();
    db.set(key(0, 0, 0), singleBlockSubchunk("minecraft:stone"));
    db.set(key(1, 0, 0), singleBlockSubchunk("minecraft:stone"));

    const result = await proveArenaVoxelEquivalence(
      reader(db),
      {
        canonical: {
          arenaId: "arena-1",
          anchor: { x: 0, y: 0, z: 0 },
          items: [],
        },
        replicas: [{
          arenaId: "arena-2",
          anchor: { x: 17, y: 0, z: 0 },
          items: [],
        }],
        offsets: [{ x: 17, y: 0, z: 0 }],
        supportByOffset: { "17,0,0": 3 },
        confidence: "medium",
        evidenceCandidates: 3,
      },
      { marginBlocks: 0, maxBlocks: 1 },
    );

    expect(result.status).toBe("verified");
  });

  it("fails closed when required subchunks are unavailable", async () => {
    const result = await proveArenaVoxelEquivalence(
      reader(new Map()),
      {
        canonical: { arenaId: "arena-1", anchor: { x: 0, y: 0, z: 0 }, items: [] },
        replicas: [{ arenaId: "arena-2", anchor: { x: 17, y: 0, z: 0 }, items: [] }],
        offsets: [{ x: 17, y: 0, z: 0 }],
        supportByOffset: { "17,0,0": 3 },
        confidence: "medium",
        evidenceCandidates: 3,
      },
      { marginBlocks: 0, maxBlocks: 1 },
    );

    expect(result.status).toBe("incomplete");
  });
});
