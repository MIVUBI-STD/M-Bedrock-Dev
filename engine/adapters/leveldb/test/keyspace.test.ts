import { describe, expect, it } from "vitest";
import { classifyBedrockLevelDbKey } from "../src/keyspace.js";

function chunkKey(
  x: number,
  z: number,
  tag: number,
  dimension?: number,
  suffix?: number,
): Uint8Array {
  const length = dimension === undefined ? 9 : 13;
  const bytes = new Uint8Array(length + (suffix === undefined ? 0 : 1));
  const view = new DataView(bytes.buffer);
  view.setInt32(0, x, true);
  view.setInt32(4, z, true);
  let offset = 8;
  if (dimension !== undefined) {
    view.setInt32(8, dimension, true);
    offset = 12;
  }
  bytes[offset] = tag;
  if (suffix !== undefined) bytes[offset + 1] = suffix & 0xff;
  return bytes;
}

describe("Bedrock LevelDB keyspace classification", () => {
  it("classifies actor and digest keyspaces", () => {
    expect(classifyBedrockLevelDbKey(
      new Uint8Array(Buffer.from("actorprefix123", "ascii")),
    ).family).toBe("actor");

    expect(classifyBedrockLevelDbKey(
      new Uint8Array(Buffer.from("digp123", "ascii")),
    ).family).toBe("actor-digest");
  });

  it("classifies chunk data and coordinates", () => {
    expect(classifyBedrockLevelDbKey(chunkKey(12, -4, 49, 0))).toMatchObject({
      family: "chunk-data",
      chunkDataKind: "BlockEntity",
      chunkX: 12,
      chunkZ: -4,
      dimensionId: 0,
    });
  });

  it("classifies subchunk index", () => {
    expect(classifyBedrockLevelDbKey(chunkKey(1, 2, 47, undefined, -3))).toMatchObject({
      family: "chunk-data",
      chunkDataKind: "SubChunkPrefix",
      subChunkIndex: -3,
    });
  });
});
