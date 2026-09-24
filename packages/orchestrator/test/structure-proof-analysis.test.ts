import { describe, expect, it } from "vitest";
import { parseMcFunction } from "../../../analyzers/functions/src/parse.js";
import { analyzeStructureAndChunkRuntime } from "../src/structure-runtime-analysis.js";
import { derivePlacementProofs } from "../src/structure-proof-analysis.js";

const structure = {
  identifier: "demo:arena",
  relativePath: "structures/demo/arena.mcstructure",
  size: { x: 16, y: 8, z: 32 },
  semantics: {
    entityCount: 0,
    hasEntities: false,
    paletteSize: 1,
    hasBlockPositionData: false,
    commandBlockPaletteEntries: 0,
    containerPaletteEntries: 0,
    embeddedCommandBlocks: 0,
    queuedTickPositions: 0,
    educationAllowEntries: 0,
    educationDenyEntries: 0,
    educationBorderEntries: 0,
  },
};

describe("structure placement proofs", () => {
  it("accepts a gated sentinel inside rotated placement bounds", () => {
    const fn = parseMcFunction(
      "demo:load",
      [
        "structure load demo:arena 100 64 200 90_degrees",
        "execute if block 100 64 200 minecraft:gold_block run function demo:start",
      ].join("\n"),
      { artifactId: "a", relativePath: "functions/load.mcfunction" },
    );

    const runtime = analyzeStructureAndChunkRuntime([fn], [structure]);
    const proofs = derivePlacementProofs(runtime, [fn]);

    expect(proofs.postPlacementVerifications).toHaveLength(1);
    expect(proofs.postPlacementVerifications[0]?.verificationLine).toBe(2);
  });

  it("does not accept an ungated sentinel as readiness proof", () => {
    const fn = parseMcFunction(
      "demo:load",
      [
        "structure load demo:arena 100 64 200",
        "testforblock 101 64 201 minecraft:gold_block",
      ].join("\n"),
      { artifactId: "a", relativePath: "functions/load.mcfunction" },
    );

    const runtime = analyzeStructureAndChunkRuntime([fn], [structure]);
    const proofs = derivePlacementProofs(runtime, [fn]);

    expect(proofs.postPlacementVerifications).toEqual([]);
  });

  it("proves area-loaded coverage only when the scheduled area covers all placement chunks", () => {
    const scheduler = parseMcFunction(
      "demo:schedule",
      "schedule on_area_loaded add 96 0 192 143 255 239 demo:load",
      { artifactId: "a", relativePath: "functions/schedule.mcfunction" },
    );
    const loader = parseMcFunction(
      "demo:load",
      "structure load demo:arena 100 64 200",
      { artifactId: "a", relativePath: "functions/load.mcfunction" },
    );

    const runtime = analyzeStructureAndChunkRuntime([scheduler, loader], [structure]);
    const proofs = derivePlacementProofs(runtime, [scheduler, loader]);

    expect(proofs.areaLoadedCoverage).toHaveLength(1);
    expect(proofs.areaLoadedCoverage[0]?.functionId).toBe("demo:load");
  });
});
