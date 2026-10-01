import { describe, expect, it } from "vitest";
import {
  comp,
  int,
  writeUncompressed,
  type NBT,
} from "prismarine-nbt";
import type { BedrockLevelDbReader } from "../../../../adapters/leveldb/src/index.js";
import { extractPersistedPackIdentities } from "../../src/release/persisted-pack-identity.js";

describe("persisted pack identity extraction", () => {
  it("reads DynamicProperties as bounded named NBT evidence", async () => {
    const bytes = writeUncompressed(
      comp({
        "8a121475-6f9f-4780-a746-2bf25f732204": comp({
          score: int(10),
        }),
      }, "") as NBT,
      "little",
    );

    const reader: BedrockLevelDbReader = {
      async get(key) {
        return Buffer.from(key).toString("utf8") === "DynamicProperties"
          ? bytes
          : undefined;
      },
      async *entries() {},
      async close() {},
    };

    const result = await extractPersistedPackIdentities(reader);
    expect(result.status).toBe("parsed");
    expect(result.namespaces[0]?.identity).toBe(
      "8a121475-6f9f-4780-a746-2bf25f732204",
    );
  });
});
