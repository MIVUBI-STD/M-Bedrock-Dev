import { describe, expect, it } from "vitest";
import { correlateEmbeddedCommandsWithNativeChunks } from "../src/embedded-native-correlation.js";

describe("embedded command native correlation", () => {
  it("annotates command placements with block-entity and tick evidence", () => {
    const result = correlateEmbeddedCommandsWithNativeChunks([{
      target: "demo:arena",
      flatIndex: 3,
      worldX: 33,
      worldY: 70,
      worldZ: -1,
      chunkX: 2,
      chunkZ: -1,
      command: "function demo:start",
      confidence: "inferred-transform",
    }], [{
      dimensionId: 0,
      chunkX: 2,
      chunkZ: -1,
      kinds: ["BlockEntity", "PendingTicks"],
    }]);

    expect(result[0]?.matches[0]).toMatchObject({
      hasBlockEntityEvidence: true,
      hasPendingTickEvidence: true,
      hasRandomTickEvidence: false,
    });
  });
});
