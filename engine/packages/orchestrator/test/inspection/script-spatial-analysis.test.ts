import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeScriptSpatialMutations } from "../../src/inspection/script-spatial-analysis.js";

describe("script spatial analysis", () => {
  it("resolves deterministic script coordinates into topology effects", () => {
    const script = parseScriptFile(
      "main",
      [
        "const P = { x: 10, y: 20, z: 30 };",
        "function setup(dimension) {",
        "  dimension.setBlockType(P, 'minecraft:stone');",
        "  dimension.spawnEntity('minecraft:zombie', P);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeScriptSpatialMutations([script]);
    expect(result.resolvedEffects).toEqual([
      {
        kind: "setblock",
        position: { x: 10, y: 20, z: 30 },
        block: "minecraft:stone",
        sourcePath: "scripts/main.ts",
      },
      {
        kind: "entity-spawn",
        entityIdentifier: "minecraft:zombie",
        position: { x: 10, y: 20, z: 30 },
        sourcePath: "scripts/main.ts",
      },
    ]);
  });

  it("preserves teleport destination policy in resolved source evidence", () => {
    const script = parseScriptFile(
      "main",
      [
        "const P = { x: 1, y: 2, z: 3 };",
        "player.teleport(P, { dimension: nether, checkForBlocks: true });",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    const result = analyzeScriptSpatialMutations([script]);
    expect(result.resolvedEffectSources[0]).toMatchObject({
      dimensionExpression: "nether",
      checkForBlocks: true,
    });
  });

  it("keeps runtime-dynamic block identity out of topology proof", () => {
    const script = parseScriptFile(
      "main",
      [
        "const P = { x: 1, y: 2, z: 3 };",
        "function setup(dimension, blockType) {",
        "  dimension.setBlockType(P, blockType);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeScriptSpatialMutations([script]);
    expect(result.resolvedEffects).toEqual([]);
    expect(result.failures[0]?.reason).toMatch(
      /runtime-dynamic/,
    );
  });
});
