import { describe, expect, it } from "vitest";
import { parseStructureLoadSemantics } from "../src/structure-semantics.js";
import { parseTickingAreaSemantics } from "../src/tickingarea-semantics.js";

describe("structure and ticking-area command semantics", () => {
  it("parses structure load options conservatively", () => {
    expect(parseStructureLoadSemantics(
      "structure load demo:arena 0 64 0 90_degrees x layer_by_layer 2 true true false 75 seed42",
    )).toMatchObject({
      name: "demo:arena",
      rotation: "90_degrees",
      mirror: "x",
      animationMode: "layer_by_layer",
      animationSeconds: 2,
      includeEntities: true,
      includeBlocks: true,
      waterlogged: false,
      integrity: 75,
      seed: "seed42",
    });
  });

  it("parses circle ticking areas and preload intent", () => {
    expect(parseTickingAreaSemantics(
      "tickingarea add circle 0 72 0 3 arena_logic true",
    )).toMatchObject({
      action: "add-circle",
      radius: 3,
      name: "arena_logic",
      preload: true,
    });
  });
});
