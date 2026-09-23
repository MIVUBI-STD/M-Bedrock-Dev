import { describe, expect, it } from "vitest";
import { parseMcFunction } from "../../../analyzers/functions/src/parse.js";
import { analyzeStructureAndChunkRuntime } from "../src/structure-runtime-analysis.js";

describe("structure load correlation", () => {
  it("correlates load intent with actual structure content", () => {
    const fn = parseMcFunction(
      "demo/start",
      "structure load demo:arena 0 64 0 0_degrees none none 0 false true false 70 seed",
      { artifactId: "fixture", relativePath: "functions/start.mcfunction" },
    );

    const result = analyzeStructureAndChunkRuntime([fn], [{
      identifier: "demo:arena",
      relativePath: "structures/demo/arena.mcstructure",
      semantics: {
        entityCount: 2,
        hasEntities: true,
        paletteSize: 5,
        hasBlockPositionData: true,
        commandBlockPaletteEntries: 1,
        containerPaletteEntries: 1,
        embeddedCommandBlocks: 1,
        queuedTickPositions: 0,
      },
    }]);

    expect(result.correlations[0]).toMatchObject({
      status: "resolved",
      findings: expect.arrayContaining([
        "entities-excluded",
        "probabilistic-command-block-load",
        "runtime-logic-content",
      ]),
    });
  });
});
