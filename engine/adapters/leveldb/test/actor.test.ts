import { describe, expect, it } from "vitest";
import { comp, float, list, string, writeUncompressed, type NBT } from "prismarine-nbt";
import { decodeBedrockActorRecord } from "../src/actor.js";

describe("bedrock actor decoder", () => {
  it("decodes identifier and Pos without inventing other fields", async () => {
    const nbt = comp({
      identifier: string("minecraft:zombie"),
      Pos: list(
        float([
          10.5,
          64,
          -2.25,
        ]),
      ),
    }, "") as NBT;
    const bytes = new Uint8Array(
      writeUncompressed(nbt, "little"),
    );

    const decoded =
      await decodeBedrockActorRecord(bytes);

    expect(decoded.identifier)
      .toBe("minecraft:zombie");
    expect(decoded.position)
      .toEqual({
        x: 10.5,
        y: 64,
        z: -2.25,
      });
  });
});
