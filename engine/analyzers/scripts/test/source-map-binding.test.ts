import { describe, expect, it } from "vitest";
import {
  bindGeneratedPosition,
  parseSourceMapV3,
} from "../src/source-map-binding.js";

describe("source map binding", () => {
  it("binds a simple VLQ segment", () => {
    const map = parseSourceMapV3({
      version: 3,
      file: "bundle.js",
      sourceRoot: "src",
      sources: ["main.ts"],
      names: [],
      mappings: "AAAA",
    });

    expect(bindGeneratedPosition(map, 1, 0)).toEqual(
      expect.objectContaining({
        status: "resolved",
        source: "src/main.ts",
        originalLine: 1,
        originalColumn: 0,
      }),
    );
  });

  it("fails closed on invalid mappings", () => {
    const map = parseSourceMapV3({
      version: 3,
      sources: ["main.ts"],
      names: [],
      mappings: "*",
    });

    expect(bindGeneratedPosition(map, 1, 0).status).toBe("invalid");
  });
});
