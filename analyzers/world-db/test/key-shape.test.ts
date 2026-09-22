import { describe, expect, it } from "vitest";
import { analyzeWorldDbKey } from "../src/key-shape.js";

describe("world DB key shape", () => {
  it("distinguishes printable named keys from binary keys without assigning semantic meaning", () => {
    expect(analyzeWorldDbKey(new Uint8Array(Buffer.from("DynamicProperties"))))
      .toMatchObject({ shape: "ascii-named", asciiName: "DynamicProperties" });

    expect(analyzeWorldDbKey(new Uint8Array([1, 0, 2, 255])).shape)
      .toBe("binary");
  });
});
