import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../scripts/src/parse.js";
import { scriptPropertyWriteDiagnostics } from "../src/script-property-write-findings.js";

const source = {
  artifactId: "fixture",
  relativePath: "scripts/main.ts",
};

describe("script property mutability diagnostics", () => {
  it("allows component value writes before 2.0.0", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        const entity = world.getDimension("overworld").getEntities()[0];
        const scale = entity.getComponent("minecraft:scale");
        scale.value = 2;
      `,
      source,
    );

    expect(scriptPropertyWriteDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "1.19.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script])).toEqual([]);
  });

  it("flags the same write after the property became read-only", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        const entity = world.getDimension("overworld").getEntities()[0];
        const scale = entity.getComponent("minecraft:scale");
        scale.value = 2;
      `,
      source,
    );

    expect(scriptPropertyWriteDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "2.0.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script])).toEqual([
      expect.objectContaining({
        code: "SCRIPT_API_PROPERTY_WRITE_INCOMPATIBLE",
        severity: "critical",
        data: expect.objectContaining({
          symbol: "EntityScaleComponent.value",
          observedOperation: "assign",
          transitionIn: "2.0.0",
        }),
      }),
    ]);
  });
});
