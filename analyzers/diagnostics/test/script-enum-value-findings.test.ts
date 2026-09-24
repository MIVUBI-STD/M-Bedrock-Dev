import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../scripts/src/index.js";
import { scriptEnumValueDiagnostics } from "../src/script-enum-value-findings.js";

const source = {
  artifactId: "fixture",
  relativePath: "scripts/main.ts",
};

describe("script enum backing-value diagnostics", () => {
  it("flags the 1.x FluidContainer backing value on 2.x", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { BlockComponentTypes } from "@minecraft/server";
        BlockComponentTypes.FluidContainer === "minecraft:fluidContainer";
      `,
      source,
    );

    expect(scriptEnumValueDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "2.0.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script])).toEqual([
      expect.objectContaining({
        code: "SCRIPT_API_ENUM_VALUE_INCOMPATIBLE",
        severity: "medium",
        data: expect.objectContaining({
          symbol: "BlockComponentTypes.FluidContainer",
          observedLiteral: "minecraft:fluidContainer",
          expectedLiteral: "minecraft:fluid_container",
        }),
      }),
    ]);
  });

  it("accepts the correct backing value on each API line", () => {
    const oldScript = parseScriptFile(
      "scripts/old",
      'import { BlockComponentTypes } from "@minecraft/server"; BlockComponentTypes.FluidContainer === "minecraft:fluidContainer";',
      source,
    );
    const newScript = parseScriptFile(
      "scripts/new",
      'import { BlockComponentTypes } from "@minecraft/server"; BlockComponentTypes.FluidContainer === "minecraft:fluid_container";',
      source,
    );

    expect(scriptEnumValueDiagnostics({
      scriptModules: [{ moduleName: "@minecraft/server", version: "1.19.0", track: "stable" }],
      educationMetadata: false,
    }, [oldScript])).toEqual([]);

    expect(scriptEnumValueDiagnostics({
      scriptModules: [{ moduleName: "@minecraft/server", version: "2.0.0", track: "stable" }],
      educationMetadata: false,
    }, [newScript])).toEqual([]);
  });
});
