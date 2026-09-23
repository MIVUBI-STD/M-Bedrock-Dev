import { describe, expect, it } from "vitest";
import { scriptMethodSymbolDiagnostics } from "../src/script-method-findings.js";
import { parseScriptFile } from "../../scripts/src/parse.js";

const source = {
  artifactId: "fixture",
  relativePath: "scripts/main.ts",
};

describe("script method symbol diagnostics", () => {
  it("flags a direct method whose stable introduction is newer than the manifest dependency", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { system } from "@minecraft/server";
        system.runInterval(() => {}, 1);
      `,
      source,
    );

    const findings = scriptMethodSymbolDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "1.0.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script]);

    expect(findings).toEqual([
      expect.objectContaining({
        code: "SCRIPT_API_VERSION_INCOMPATIBLE",
        data: expect.objectContaining({
          symbol: "system.runInterval",
          symbolKind: "method",
          requiredVersion: "1.1.0",
        }),
      }),
    ]);
  });

  it("does not invent compatibility failures for unregistered methods", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        world.someFutureMethod();
      `,
      source,
    );

    const findings = scriptMethodSymbolDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "1.0.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script]);

    expect(findings).toEqual([]);
  });
});
