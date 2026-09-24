import { describe, expect, it } from "vitest";
import { scriptMethodSymbolDiagnostics } from "../src/script-method-findings.js";
import { parseScriptFile } from "../../scripts/src/index.js";

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

  it("enforces a version rule reached through bounded receiver inference", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        const dimension = world.getDimension("overworld");
        for (const entity of dimension.getEntities()) {
          entity.getTags();
        }
      `,
      source,
    );

    const findings = scriptMethodSymbolDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "1.1.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script]);

    expect(findings).toEqual([
      expect.objectContaining({
        code: "SCRIPT_API_VERSION_INCOMPATIBLE",
        data: expect.objectContaining({
          symbol: "Entity.getTags",
          symbolKind: "method",
          requiredVersion: "1.2.0",
        }),
      }),
    ]);
  });

  it("flags a legacy method as deprecated on documented 1.x usage", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        world.playSound("note.pling", { x: 0, y: 0, z: 0 });
      `,
      source,
    );

    const findings = scriptMethodSymbolDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "1.19.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script]);

    expect(findings).toEqual([
      expect.objectContaining({
        code: "SCRIPT_API_DEPRECATED_SYMBOL",
        severity: "minor",
        data: expect.objectContaining({
          symbol: "world.playSound",
          lifecycleState: "deprecated",
          removedIn: "2.0.0",
          replacement: "Dimension.playSound",
        }),
      }),
    ]);
  });

  it("flags an inherited legacy Entity method as removed on 2.x", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        const player = world.getAllPlayers()[0];
        player.runCommandAsync("say legacy");
      `,
      source,
    );

    const findings = scriptMethodSymbolDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "2.0.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script]);

    expect(findings).toEqual([
      expect.objectContaining({
        code: "SCRIPT_API_REMOVED_SYMBOL",
        severity: "critical",
        data: expect.objectContaining({
          symbol: "Entity.runCommandAsync",
          lifecycleState: "removed",
          removedIn: "2.0.0",
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
