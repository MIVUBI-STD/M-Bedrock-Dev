import { describe, expect, it } from "vitest";
import { analyzeCommandBlockChains } from "../src/command-chain.js";

describe("command block chain topology", () => {
  it("connects command blocks according to facing direction", () => {
    const result = analyzeCommandBlockChains([
      {
        flatIndex: 0,
        coordinate: { x: 0, y: 0, z: 0 },
        paletteName: "minecraft:repeating_command_block",
        command: "say start",
        facingDirection: 5,
      },
      {
        flatIndex: 1,
        coordinate: { x: 1, y: 0, z: 0 },
        paletteName: "minecraft:chain_command_block",
        command: "say next",
        facingDirection: 5,
        conditional: true,
      },
    ]);

    expect(result.edges).toEqual([{ fromFlatIndex: 0, toFlatIndex: 1 }]);
    expect(result.issues).toEqual([]);
  });

  it("flags conditional chain blocks without an incoming predecessor", () => {
    const result = analyzeCommandBlockChains([{
      flatIndex: 4,
      coordinate: { x: 3, y: 0, z: 0 },
      paletteName: "minecraft:chain_command_block",
      command: "say orphan",
      facingDirection: 5,
      conditional: true,
    }]);

    expect(result.issues).toEqual([
      { kind: "conditional-without-predecessor", flatIndex: 4 },
    ]);
  });
});
