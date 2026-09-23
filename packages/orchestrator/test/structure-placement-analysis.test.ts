import { describe, expect, it } from "vitest";
import { derivePlacedEmbeddedCommands } from "../src/structure-placement-analysis.js";

describe("placed embedded command analysis", () => {
  it("derives world-space command locations for absolute structure loads", () => {
    const result = derivePlacedEmbeddedCommands({
      position: {
        x: { mode: "absolute", value: 10 },
        y: { mode: "absolute", value: 64 },
        z: { mode: "absolute", value: 20 },
      },
      rotation: "0_degrees",
      mirror: "none",
    }, { x: 2, y: 2, z: 2 }, [{
      flatIndex: 0,
      coordinate: { x: 1, y: 0, z: 1 },
      command: "say hello",
    }]);

    expect(result[0]).toMatchObject({
      world: { x: 11, y: 64, z: 21 },
      confidence: "inferred-transform",
    });
  });
});
