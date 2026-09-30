import { describe, expect, it } from "vitest";
import {
  extractMcStructureFootprint,
  placeMcStructureFootprint,
} from "../src/footprint.js";
import type {
  McStructureModel,
} from "../src/types.js";

function structure(): McStructureModel {
  return {
    size: { x: 2, y: 1, z: 2 },
    palette: [{
      index: 0,
      name: "minecraft:stone",
      raw: {},
    }, {
      index: 1,
      name: "minecraft:air",
      raw: {},
    }, {
      index: 2,
      name: "minecraft:structure_void",
      raw: {},
    }],
    blockIndexLayers: [{
      layer: 0,
      indices: [0, 1, 2, -1],
    }],
    entities: [],
    rawSimplified: {},
    nbt: {} as McStructureModel["nbt"],
  };
}

describe("mcstructure footprint", () => {
  it("uses canonical Bedrock flat-index coordinates", () => {
    const result =
      extractMcStructureFootprint(
        structure(),
      );

    expect(result.cells).toEqual([
      expect.objectContaining({
        x: 0,
        y: 0,
        z: 0,
        mode: "replace",
      }),
      expect.objectContaining({
        x: 0,
        y: 0,
        z: 1,
        mode: "air",
      }),
      expect.objectContaining({
        x: 1,
        y: 0,
        z: 0,
        mode: "void",
      }),
    ]);
    expect(result.unknownPrimaryCells).toBe(1);
  });

  it("delegates rotation and mirror to the canonical placement transform", () => {
    const result =
      placeMcStructureFootprint(
        structure(),
        { x: 100, y: 50, z: 200 },
        {
          rotation: "90_degrees",
          mirror: "x",
        },
      );

    expect(result.cells[0]).toEqual(
      expect.objectContaining({
        x: 101,
        y: 50,
        z: 201,
      }),
    );
  });
});
