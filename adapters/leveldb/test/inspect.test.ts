import { describe, expect, it } from "vitest";
import {
  describeLevelDbEntry,
  scanLevelDbMetadata,
} from "../src/inspect.js";
import type { BedrockLevelDbReader } from "../src/types.js";

describe("LevelDB metadata inspection", () => {
  it("preserves binary keys as hex and exposes printable key preview only when safe", () => {
    expect(
      describeLevelDbEntry(
        new Uint8Array(Buffer.from("DynamicProperties")),
        new Uint8Array([1, 2, 3]),
      ),
    ).toMatchObject({
      keyPreview: "DynamicProperties",
      keyBytes: 17,
      valueBytes: 3,
    });

    expect(
      describeLevelDbEntry(
        new Uint8Array([0, 255, 1]),
        new Uint8Array([9]),
      ).keyPreview,
    ).toBeUndefined();
  });

  it("stops at bounded scan budgets", async () => {
    const reader: BedrockLevelDbReader = {
      async get() { return undefined; },
      async *entries() {
        yield { key: new Uint8Array([1]), value: new Uint8Array([1]) };
        yield { key: new Uint8Array([2]), value: new Uint8Array([2]) };
      },
      async close() {},
    };

    const result = await scanLevelDbMetadata(reader, {
      maxEntries: 1,
      maxValueBytes: 16,
      maxTotalValueBytes: 16,
    });

    expect(result.entriesScanned).toBe(1);
    expect(result.truncated).toBe(true);
  });
});
