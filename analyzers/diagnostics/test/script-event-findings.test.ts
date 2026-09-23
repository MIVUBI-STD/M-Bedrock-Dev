import { describe, expect, it } from "vitest";
import { scriptEventSymbolDiagnostics } from "../src/script-event-findings.js";
import { parseScriptFile } from "../../scripts/src/parse.js";

const source = {
  artifactId: "fixture",
  relativePath: "scripts/main.ts",
};

describe("script event symbol diagnostics", () => {
  it("flags beta-only event symbols against a stable module dependency", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        world.beforeEvents.playerPlaceBlock.subscribe(() => {});
      `,
      source,
    );

    const findings = scriptEventSymbolDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "2.10.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script]);

    expect(findings).toEqual([
      expect.objectContaining({
        code: "SCRIPT_API_PRERELEASE_SYMBOL",
        data: expect.objectContaining({
          symbol: "world.beforeEvents.playerPlaceBlock",
          declaredVersion: "2.10.0",
        }),
      }),
    ]);
  });

  it("does not flag a pre-release symbol when the manifest itself uses beta", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { system } from "@minecraft/server";
        system.beforeEvents.watchdogTerminate.subscribe(() => {});
      `,
      source,
    );

    const findings = scriptEventSymbolDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "2.12.0-beta.1.26.60-preview.23",
        track: "beta",
      }],
      educationMetadata: false,
    }, [script]);

    expect(findings).toEqual([]);
  });
});
