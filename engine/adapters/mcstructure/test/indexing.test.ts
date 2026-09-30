import { describe, expect, it } from "vitest";
import { flatIndexToCoordinate, validateStructureLayerLengths } from "../src/indexing.js";
import type { McStructureModel } from "../src/types.js";

describe("mcstructure indexing", () => {
  it("maps flat indices using X→Y→Z structure dimensions", () => {
    expect(flatIndexToCoordinate(0, { x: 2, y: 2, z: 2 })).toEqual({ x: 0, y: 0, z: 0 });
    expect(flatIndexToCoordinate(1, { x: 2, y: 2, z: 2 })).toEqual({ x: 0, y: 0, z: 1 });
    expect(flatIndexToCoordinate(4, { x: 2, y: 2, z: 2 })).toEqual({ x: 1, y: 0, z: 0 });
  });

  it("checks every block index layer against structure volume", () => {
    const structure = {
      size: { x: 2, y: 1, z: 2 },
      palette: [],
      blockIndexLayers: [
        { layer: 0, indices: [0, 0, 0, 0] },
        { layer: 1, indices: [-1, -1] },
      ],
      entities: [],
      rawSimplified: {},
      nbt: {} as McStructureModel["nbt"],
    } satisfies McStructureModel;

    expect(validateStructureLayerLengths(structure)).toEqual({
      ok: false,
      expected: 4,
      invalidLayers: [1],
    });
  });
});
