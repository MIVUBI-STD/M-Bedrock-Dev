import { describe, expect, it } from "vitest";
import { parseCliTargetOptions } from "../src/target-options.js";

describe("CLI target options", () => {
  it("separates positional artifacts from runtime profile flags", () => {
    const parsed = parseCliTargetOptions([
      "map.mcworld",
      "--edition", "education",
      "--version", "1.21.130",
      "--experiment", "beta-apis",
      "--experiment", "custom-biomes",
    ]);

    expect(parsed.positionals).toEqual(["map.mcworld"]);
    expect(parsed.target).toEqual({
      edition: "education",
      version: "1.21.130",
      experiments: ["beta-apis", "custom-biomes"],
    });
  });

  it("rejects invalid edition instead of guessing", () => {
    expect(() => parseCliTargetOptions(["map.mcworld", "--edition", "java"]))
      .toThrow(/bedrock or education/);
  });
});