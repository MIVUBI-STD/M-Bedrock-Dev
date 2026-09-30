import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../scripts/src/index.js";
import { scriptSignatureDiagnostics } from "../src/script-signature-findings.js";

const source = {
  artifactId: "fixture",
  relativePath: "scripts/main.ts",
};

describe("script signature diagnostics", () => {
  it("flags the legacy four-argument applyKnockback shape on 2.x", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        const player = world.getAllPlayers()[0];
        player.applyKnockback(0, 1, 0.5, 0.4);
      `,
      source,
    );

    const findings = scriptSignatureDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "2.0.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script]);

    expect(findings).toEqual([
      expect.objectContaining({
        code: "SCRIPT_API_SIGNATURE_INCOMPATIBLE",
        severity: "critical",
        data: expect.objectContaining({
          symbol: "Entity.applyKnockback",
          expectedMinArgs: 2,
          expectedMaxArgs: 2,
          observedArgumentCount: 4,
          transitionIn: "2.0.0",
        }),
      }),
    ]);
  });

  it("flags spawnEntity options against a 1.x dependency", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        const dimension = world.getDimension("overworld");
        dimension.spawnEntity("minecraft:zombie", { x: 0, y: 0, z: 0 }, {
          initialPersistence: true,
        });
      `,
      source,
    );

    const findings = scriptSignatureDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "1.19.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script]);

    expect(findings).toEqual([
      expect.objectContaining({
        code: "SCRIPT_API_SIGNATURE_INCOMPATIBLE",
        severity: "medium",
        data: expect.objectContaining({
          symbol: "Dimension.spawnEntity",
          expectedMinArgs: 2,
          expectedMaxArgs: 2,
          observedArgumentCount: 3,
        }),
      }),
    ]);
  });

  it("does not flag the current applyKnockback shape on 2.x", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        const player = world.getAllPlayers()[0];
        player.applyKnockback({ x: 0, z: 1 }, 0.4);
      `,
      source,
    );

    expect(scriptSignatureDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "2.0.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script])).toEqual([]);
  });
});
