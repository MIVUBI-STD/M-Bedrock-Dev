import { describe, expect, it } from "vitest";
import {
  decodeWorldDbRuntimeStateKey,
} from "../src/runtime-state-decoder.js";

describe("world runtime-state key decoder", () => {
  it("decodes conservative ASCII runtime keys and arena ownership", () => {
    const result = decodeWorldDbRuntimeStateKey(
      new TextEncoder().encode(
        "tickingarea_arena-3_gameplay",
      ),
    );

    expect(result.record).toEqual(
      expect.objectContaining({
        kind: "ticking-area",
        arenaId: "3",
      }),
    );
  });

  it("leaves unknown binary keys unclassified", () => {
    const result = decodeWorldDbRuntimeStateKey(
      Uint8Array.from([0, 255, 1]),
    );
    expect(result.confidence).toBe("unknown");
    expect(result.record).toBeUndefined();
  });
});
