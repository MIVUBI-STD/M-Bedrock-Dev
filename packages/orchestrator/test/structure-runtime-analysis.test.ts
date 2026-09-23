import { describe, expect, it } from "vitest";
import { parseMcFunction } from "../../../analyzers/functions/src/parse.js";
import { analyzeStructureAndChunkRuntime } from "../src/structure-runtime-analysis.js";

describe("structure and chunk runtime analysis", () => {
  it("summarizes structure load and ticking-area semantics", () => {
    const fn = parseMcFunction(
      "demo/start",
      [
        "structure load demo:arena 0 64 0 0_degrees none true true false 80 seed",
        "tickingarea add circle 0 64 0 2 arena_logic true",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "functions/start.mcfunction" },
    );

    const result = analyzeStructureAndChunkRuntime([fn]);
    expect(result.probabilisticStructureLoads).toBe(1);
    expect(result.preloadedTickingAreas).toBe(1);
  });
});
