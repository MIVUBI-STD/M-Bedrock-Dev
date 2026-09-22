import { describe, expect, it } from "vitest";
import { evaluateCapability } from "../src/engine.js";
import { classifyScriptApiVersion } from "../src/script-api.js";
import { parseGameVersion } from "../src/version.js";
import { CORE_CAPABILITY_RULES } from "../../../rules/capabilities/core.js";

describe("compatibility", () => {
  it("parses array and semantic string game versions", () => {
    expect(parseGameVersion([1, 21, 40])).toEqual({ major: 1, minor: 21, patch: 40 });
    expect(parseGameVersion("1.21.40")).toEqual({ major: 1, minor: 21, patch: 40 });
  });

  it("classifies beta Script API versions", () => {
    expect(classifyScriptApiVersion("@minecraft/server", "2.0.0-beta").track).toBe("beta");
  });

  it("requires Beta APIs experiment for beta Script API capability", () => {
    const withoutExperiment = evaluateCapability(
      CORE_CAPABILITY_RULES["script-api.beta"] ?? [],
      { edition: "bedrock" },
    );

    const withExperiment = evaluateCapability(
      CORE_CAPABILITY_RULES["script-api.beta"] ?? [],
      { edition: "bedrock", experiments: ["Beta APIs"] },
    );

    expect(withoutExperiment.supported).toBe(false);
    expect(withExperiment.supported).toBe(true);
  });
});
