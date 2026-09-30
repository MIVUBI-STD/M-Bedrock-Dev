import { describe, expect, it } from "vitest";
import { parseBlockVerificationSemantics } from "../src/verification-semantics.js";

describe("block verification semantics", () => {
  it("does not treat standalone testforblock as a gameplay gate", () => {
    expect(parseBlockVerificationSemantics(
      "testforblock 1 64 1 minecraft:gold_block",
    )).toMatchObject({
      mechanism: "testforblock",
      gatesDependentCommand: false,
      expectedBlock: "minecraft:gold_block",
    });
  });

  it("recognizes execute-if-block with run as a gated verification", () => {
    expect(parseBlockVerificationSemantics(
      "execute if block 1 64 1 minecraft:gold_block run function demo:start",
    )).toMatchObject({
      mechanism: "execute-if-block",
      gatesDependentCommand: true,
      expectedBlock: "minecraft:gold_block",
    });
  });
});
