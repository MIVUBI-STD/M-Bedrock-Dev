import { describe, expect, it } from "vitest";
import { analyzeEmbeddedStructureCommands } from "../src/embedded-structure-commands.js";

describe("embedded structure command analysis", () => {
  it("feeds command-block text back through the command analyzer", () => {
    const result = analyzeEmbeddedStructureCommands([{
      flatIndex: 0,
      command: "function demo:start",
      auto: true,
    }], {
      artifactId: "fixture",
      relativePath: "structures/demo/arena.mcstructure",
    });

    expect(result[0]?.effects).toEqual([
      expect.objectContaining({
        kind: "function-call",
        target: "demo:start",
      }),
    ]);
    expect(result[0]?.unknownEffects).toBe(0);
  });
});
