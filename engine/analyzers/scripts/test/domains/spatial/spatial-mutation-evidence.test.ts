import { describe, expect, it } from "vitest";
import { deriveScriptSpatialMutations } from "../../../src/domains/spatial/spatial-mutation-evidence.js";

const source = {
  artifactId: "fixture",
  relativePath: "scripts/main.ts",
};

describe("script non-block spatial mutation evidence", () => {
  it("extracts deterministic movement/entity/structure operations", () => {
    const result = deriveScriptSpatialMutations(
      [
        "const P = { x: 10, y: 20, z: 30 };",
        "function setup(dimension, player, structureManager) {",
        "  dimension.spawnEntity('minecraft:zombie', P);",
        "  player.teleport(P);",
        "  structureManager.place('arena/base', dimension, P);",
        "}",
      ].join("\n"),
      source,
    );

    expect(result.mutations.map((item) => item.kind))
      .toEqual([
        "entity-spawn",
        "teleport",
        "structure-place",
      ]);
    expect(result.rejected).toEqual([]);
  });

  it("preserves explicit teleport dimension and collision policy", () => {
    const result = deriveScriptSpatialMutations(
      [
        "const P = { x: 1, y: 2, z: 3 };",
        "player.teleport(P, { dimension: nether, checkForBlocks: true });",
      ].join("\n"),
      source,
    );
    expect(result.mutations[0]).toMatchObject({
      kind: "teleport",
      dimensionExpression: "nether",
      checkForBlocks: true,
    });
  });

  it("rejects runtime-computed coordinates instead of executing them", () => {
    const result = deriveScriptSpatialMutations(
      "dimension.spawnEntity('minecraft:zombie', getRuntimeLocation());",
      source,
    );

    expect(result.mutations).toEqual([]);
    expect(result.rejected[0]).toMatchObject({
      method: "spawnEntity",
    });
  });
});
