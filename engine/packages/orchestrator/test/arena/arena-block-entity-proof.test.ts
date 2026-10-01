import {
  comp,
  int,
  string,
  writeUncompressed,
  type NBT,
} from "prismarine-nbt";
import { describe, expect, it } from "vitest";
import type { BedrockLevelDbReader } from "../../../../adapters/leveldb/src/index.js";
import { proveArenaBlockEntityEquivalence } from "../../src/arena/arena-block-entity-proof.js";

function key(chunkX: number, chunkZ: number): string {
  const bytes = Buffer.alloc(9);
  bytes.writeInt32LE(chunkX, 0);
  bytes.writeInt32LE(chunkZ, 4);
  bytes[8] = 49;
  return bytes.toString("hex");
}

function entity(
  x: number,
  y: number,
  z: number,
  command: string,
) {
  return writeUncompressed(
    comp({
      id: string("CommandBlock"),
      x: int(x),
      y: int(y),
      z: int(z),
      Command: string(command),
    }, "") as NBT,
    "little",
  );
}

function reader(values: Map<string, Uint8Array>): BedrockLevelDbReader {
  return {
    async get(raw) {
      return values.get(Buffer.from(raw).toString("hex"));
    },
    async *entries() {},
    async close() {},
  };
}

const layout = {
  basis: "script-config" as const,
  canonical: {
    arenaId: "arena-1",
    anchor: { x: 0, y: 0, z: 0 },
  },
  replicas: [{
    arenaId: "arena-2",
    anchor: { x: 32, y: 0, z: 0 },
  }],
  offsets: [{ x: 32, y: 0, z: 0 }],
  confidence: "medium" as const,
};

describe("arena block entity proof", () => {
  it("normalizes translated coordinates and verifies equal payload", async () => {
    const values = new Map<string, Uint8Array>([
      [key(0, 0), entity(1, 2, 3, "say hello")],
      [key(2, 0), entity(33, 2, 3, "say hello")],
    ]);

    const result = await proveArenaBlockEntityEquivalence(
      reader(values),
      layout,
      {
        includedVolumes: [{
          min: { x: 0, y: 0, z: 0 },
          max: { x: 15, y: 15, z: 15 },
        }],
      },
    );

    expect(result.status).toBe("verified");
    expect(result.replicas[0]).toMatchObject({
      status: "verified",
      mismatchCount: 0,
      comparedEntities: 1,
    });
  });

  it("detects semantic NBT payload divergence", async () => {
    const values = new Map<string, Uint8Array>([
      [key(0, 0), entity(1, 2, 3, "say hello")],
      [key(2, 0), entity(33, 2, 3, "say different")],
    ]);

    const result = await proveArenaBlockEntityEquivalence(
      reader(values),
      layout,
      {
        includedVolumes: [{
          min: { x: 0, y: 0, z: 0 },
          max: { x: 15, y: 15, z: 15 },
        }],
      },
    );

    expect(result.status).toBe("diverged");
    expect(result.replicas[0]?.mismatches[0]?.kind)
      .toBe("payload-mismatch");
  });

  it("treats absent records as an empty block-entity set", async () => {
    const result = await proveArenaBlockEntityEquivalence(
      reader(new Map()),
      layout,
      {
        includedVolumes: [{
          min: { x: 0, y: 0, z: 0 },
          max: { x: 15, y: 15, z: 15 },
        }],
      },
    );

    expect(result.status).toBe("verified");
    expect(result.canonicalEntities).toBe(0);
  });
});
