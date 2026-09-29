import { describe, expect, it } from "vitest";
import {
  comp,
  int,
  string,
  writeUncompressed,
  type NBT,
} from "prismarine-nbt";
import { decodeBedrockBlockEntityRecord } from "../src/block-entity.js";

function entity(
  id: string,
  x: number,
  y: number,
  z: number,
): Buffer {
  return writeUncompressed(
    comp({
      id: string(id),
      x: int(x),
      y: int(y),
      z: int(z),
    }, "") as NBT,
    "little",
  );
}

describe("Bedrock block entity record decoder", () => {
  it("decodes concatenated little-endian block entity compounds", async () => {
    const bytes = Buffer.concat([
      entity("Chest", 1, 2, 3),
      entity("CommandBlock", 4, 5, 6),
    ]);

    const result =
      await decodeBedrockBlockEntityRecord(bytes);

    expect(result.entities).toHaveLength(2);
    expect(result.entities[0]).toMatchObject({
      identifier: "Chest",
      position: { x: 1, y: 2, z: 3 },
    });
    expect(result.entities[1]).toMatchObject({
      identifier: "CommandBlock",
      position: { x: 4, y: 5, z: 6 },
    });
    expect(result.bytesConsumed).toBe(bytes.length);
  });
});
