import { describe, expect, it } from "vitest";
import { checkScriptApiCapability } from "../src/script-api-matrix.js";

describe("Script API version matrix", () => {
  it("evaluates documented stable capability minima", () => {
    expect(checkScriptApiCapability(
      "script.dynamic-properties.world-entity",
      "@minecraft/server",
      "1.7.0",
    ).supported).toBe(true);

    expect(checkScriptApiCapability(
      "script.dynamic-properties.world-entity",
      "@minecraft/server",
      "1.6.0",
    ).supported).toBe(false);
  });

  it("keeps beta/prerelease evaluation unknown unless track-specific", () => {
    expect(checkScriptApiCapability(
      "script.system-before-events",
      "@minecraft/server",
      "2.12.0-beta.1.26.60-preview.25",
    ).supported).toBe("unknown");
  });
});
