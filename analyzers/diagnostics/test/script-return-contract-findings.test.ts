import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../scripts/src/parse.js";
import { scriptReturnContractDiagnostics } from "../src/script-return-contract-findings.js";

const source = {
  artifactId: "fixture",
  relativePath: "scripts/main.ts",
};

describe("script return-contract diagnostics", () => {
  it("flags direct dereference after Entity.getComponent became optional", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        const entity = world.getDimension("overworld").getEntities()[0];
        const value = entity.getComponent("minecraft:health").currentValue;
      `,
      source,
    );

    const findings = scriptReturnContractDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "1.18.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script]);

    expect(findings).toEqual([
      expect.objectContaining({
        code: "SCRIPT_API_RETURN_CONTRACT_RISK",
        severity: "medium",
        data: expect.objectContaining({
          symbol: "Entity.getComponent",
          transitionIn: "1.18.0",
          observedResultUse: "dereferenced",
        }),
      }),
    ]);
  });

  it("does not flag optional chaining", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        const entity = world.getDimension("overworld").getEntities()[0];
        const value = entity.getComponent("minecraft:health")?.currentValue;
      `,
      source,
    );

    expect(scriptReturnContractDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "1.18.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script])).toEqual([]);
  });

  it("does not guess assigned downstream flow", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        const entity = world.getDimension("overworld").getEntities()[0];
        const component = entity.getComponent("minecraft:health");
        if (component) component.currentValue;
      `,
      source,
    );

    expect(scriptReturnContractDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "1.18.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script])).toEqual([]);
  });
});
