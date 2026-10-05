import { describe, expect, it } from "vitest";
import type { BedrockLevelDbReader } from "../../../../adapters/leveldb/src/index.js";
import { comp, int, string, writeUncompressed, type NBT } from "prismarine-nbt";
import { proveArenaBarrierContainment, proveArenaBarrierEnclosure, proveArenaVoxelEquivalence } from "../../src/arena/arena-voxel-proof.js";

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
  it("proves a closed barrier shell blocks flight-style 3D traversal", async () => {
    const db = new Map<string, Uint8Array>();
    for (let chunkX = -1; chunkX <= 1; chunkX += 1) {
      for (let chunkZ = -1; chunkZ <= 1; chunkZ += 1) {
        for (let subY = -1; subY <= 1; subY += 1) {
          const interior = chunkX === 0 && chunkZ === 0 && subY === 0;
          db.set(
            key(chunkX, chunkZ, subY),
            singleBlockSubchunk(interior ? "minecraft:air" : "minecraft:barrier"),
          );
        }
      }
    }

    const result = await proveArenaBarrierContainment(
      reader(db),
      {
        searchVolume: {
          min: { x: -16, y: -16, z: -16 },
          max: { x: 31, y: 31, z: 31 },
        },
        starts: [{ x: 8, y: 2, z: 8 }],
        maxVisitedPositions: 20_000,
      },
    );

    expect(result.status).toBe("contained");
    expect(result.escapePosition).toBeUndefined();
  });

  it("does not call an open barrier shell contained", async () => {
    const db = new Map<string, Uint8Array>();
    for (let chunkX = -1; chunkX <= 1; chunkX += 1) {
      for (let chunkZ = -1; chunkZ <= 1; chunkZ += 1) {
        for (let subY = -1; subY <= 1; subY += 1) {
          const interior = chunkX === 0 && chunkZ === 0 && subY === 0;
          const opening = chunkX === 1 && chunkZ === 0 && subY === 0;
          db.set(
            key(chunkX, chunkZ, subY),
            singleBlockSubchunk(
              interior || opening ? "minecraft:air" : "minecraft:barrier",
            ),
          );
        }
      }
    }

    const result = await proveArenaBarrierContainment(
      reader(db),
      {
        searchVolume: {
          min: { x: -16, y: -16, z: -16 },
          max: { x: 31, y: 31, z: 31 },
        },
        starts: [{ x: 8, y: 2, z: 8 }],
        maxVisitedPositions: 40_000,
      },
    );

    expect(result.status).toBe("escape-reachable");
    expect(result.escapePosition).toBeDefined();
  });

  it("fails closed when barrier containment evidence is incomplete", async () => {
    const result = await proveArenaBarrierContainment(
      reader(new Map()),
      {
        searchVolume: {
          min: { x: -2, y: -2, z: -2 },
          max: { x: 2, y: 3, z: 2 },
        },
        starts: [{ x: 0, y: 0, z: 0 }],
      },
    );

    expect(result.status).toBe("incomplete");
  });
  it("marks barrier enclosure open-or-unproven when exterior reaches authored volume", async () => {
    const db = new Map<string, Uint8Array>();
    for (let chunkX = -1; chunkX <= 1; chunkX += 1) {
      for (let chunkZ = -1; chunkZ <= 1; chunkZ += 1) {
        for (let subY = -1; subY <= 1; subY += 1) {
          db.set(
            key(chunkX, chunkZ, subY),
            singleBlockSubchunk("minecraft:air"),
          );
        }
      }
    }

    const result = await proveArenaBarrierEnclosure(
      reader(db),
      {
        basis: "topology",
        canonical: {
          arenaId: "arena-1",
          anchor: { x: 0, y: 0, z: 0 },
        },
        replicas: [],
        offsets: [],
        confidence: "high",
      },
      {
        volumes: [{
          min: { x: 0, y: 0, z: 0 },
          max: { x: 1, y: 2, z: 1 },
          evidenceCandidateIds: ["fixture"],
        }],
        boundingBox: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 1, y: 2, z: 1 },
        },
        totalBlocks: 12,
        evidenceCandidates: 1,
        mergeGapBlocks: 0,
        confidence: "high",
      },
      {
        searchMarginBlocks: 4,
        maxVisitedPositionsPerArena: 10_000,
      },
    );

    expect(result.status).toBe("open-or-unproven");
    expect(result.arenas[0]?.reachedTargetPosition).toBeDefined();
  });

  it("fails closed when exterior barrier evidence is unavailable", async () => {
    const result = await proveArenaBarrierEnclosure(
      reader(new Map()),
      {
        basis: "topology",
        canonical: {
          arenaId: "arena-1",
          anchor: { x: 0, y: 0, z: 0 },
        },
        replicas: [],
        offsets: [],
        confidence: "high",
      },
      {
        volumes: [{
          min: { x: 0, y: 0, z: 0 },
          max: { x: 1, y: 2, z: 1 },
          evidenceCandidateIds: ["fixture"],
        }],
        boundingBox: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 1, y: 2, z: 1 },
        },
        totalBlocks: 12,
        evidenceCandidates: 1,
        mergeGapBlocks: 0,
        confidence: "high",
      },
    );

    expect(result.status).toBe("incomplete");
  });
});
