import { describe, expect, it } from "vitest";
import { scriptEventSymbolDiagnostics } from "../src/script-event-findings.js";
import { parseScriptFile } from "../../scripts/src/index.js";

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

  it("flags a legacy event as deprecated on 1.x and removed on 2.x", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        world.afterEvents.itemUseOn.subscribe(() => {});
      `,
      source,
    );

    const deprecated = scriptEventSymbolDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "1.19.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script]);

    expect(deprecated).toEqual([
      expect.objectContaining({
        code: "SCRIPT_API_DEPRECATED_SYMBOL",
        severity: "minor",
        data: expect.objectContaining({
          symbol: "world.afterEvents.itemUseOn",
          lifecycleState: "deprecated",
          replacement: "world.afterEvents.playerInteractWithBlock",
        }),
      }),
    ]);

    const removed = scriptEventSymbolDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "2.0.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script]);

    expect(removed).toEqual([
      expect.objectContaining({
        code: "SCRIPT_API_REMOVED_SYMBOL",
        severity: "critical",
        data: expect.objectContaining({
          symbol: "world.afterEvents.itemUseOn",
          lifecycleState: "removed",
          removedIn: "2.0.0",
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
