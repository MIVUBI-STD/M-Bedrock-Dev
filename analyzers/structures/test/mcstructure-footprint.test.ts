import { describe, expect, it } from "vitest";
import {
  extractMcstructureFootprintFromSimplifiedNbt,
} from "../src/mcstructure-footprint.js";

describe("mcstructure footprint", () => {
  it("normalizes air, structure void, replacement, and unknown cells conservatively", () => {
    const result =
      extractMcstructureFootprintFromSimplifiedNbt({
        size: [4, 1, 1],
        structure_world_origin: [10, 20, 30],
        structure: {
          block_indices: [[0, 1, 2, -1]],
          palette: {
            default: {
              block_palette: [
                { name: "minecraft:stone" },
                { name: "minecraft:air" },
                { name: "minecraft:structure_void" },
              ],
            },
          },
        },
      });

    expect(result.cells.map((cell) => cell.mode)).toEqual([
      "replace",
      "air",
      "void",
    ]);
    expect(result.unknownPrimaryCells).toBe(1);
  });
});
