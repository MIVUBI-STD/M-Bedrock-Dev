import { describe, expect, it } from "vitest";
import { comp, int, string, writeUncompressed } from "prismarine-nbt";
import {
  blockAt,
  decodeBedrockSubChunk,
} from "../src/subchunk.js";

function paletteBlock(name: string) {
  return comp({
    name: string(name),
    states: comp({}),
    version: int(1),
  }, "");
}

describe("Bedrock subchunk decoder", () => {
  it("decodes a v9 single-block persistent layer", async () => {
    const palette = writeUncompressed(paletteBlock("minecraft:stone"), "little");
    const bytes = Buffer.concat([
      Buffer.from([9, 1, 0, 0]),
      palette,
    ]);

    const decoded = await decodeBedrockSubChunk(bytes);
    expect(decoded.version).toBe(9);
    expect(decoded.yIndex).toBe(0);
    expect(blockAt(decoded, 0, 0, 0)?.name).toBe("minecraft:stone");
    expect(blockAt(decoded, 15, 15, 15)?.name).toBe("minecraft:stone");
  });

  it("rejects runtime palettes rather than fabricating stable block identities", async () => {
    const bytes = Buffer.from([9, 1, 0, 3]);
    await expect(decodeBedrockSubChunk(bytes)).rejects.toThrow(
      /Runtime-ID/,
    );
  });
});
