import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../scripts/src/parse.js";
import {
  scriptEnumLifecycleDiagnostics,
  scriptPropertyLifecycleDiagnostics,
} from "../src/script-member-findings.js";

const source = {
  artifactId: "fixture",
  relativePath: "scripts/main.ts",
};

describe("script property and enum lifecycle diagnostics", () => {
  it("flags PlayerInputPermissions legacy properties as deprecated on 1.x", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        const player = world.getAllPlayers()[0];
        player.inputPermissions.cameraEnabled;
      `,
      source,
    );

    const findings = scriptPropertyLifecycleDiagnostics({
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
          symbol: "PlayerInputPermissions.cameraEnabled",
          symbolKind: "property",
          lifecycleState: "deprecated",
          removedIn: "2.0.0",
        }),
      }),
    ]);
  });

  it("flags the same property as removed on 2.x", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        const player = world.getAllPlayers()[0];
        player.inputPermissions.movementEnabled;
      `,
      source,
    );

    const findings = scriptPropertyLifecycleDiagnostics({
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
          symbol: "PlayerInputPermissions.movementEnabled",
          symbolKind: "property",
          lifecycleState: "removed",
        }),
      }),
    ]);
  });

  it("keeps lowercase GameMode active on 1.x but marks it removed on 2.x", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { GameMode as GM } from "@minecraft/server";
        const mode = GM.adventure;
      `,
      source,
    );

    expect(scriptEnumLifecycleDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "1.19.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script])).toEqual([]);

    const removed = scriptEnumLifecycleDiagnostics({
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
          symbol: "GameMode.adventure",
          symbolKind: "enum",
          lifecycleState: "removed",
          replacement: "GameMode.Adventure",
        }),
      }),
    ]);
  });

  it("does not flag the replacement uppercase GameMode member", () => {
    const script = parseScriptFile(
      "scripts/main",
      `
        import { GameMode } from "@minecraft/server";
        const mode = GameMode.Adventure;
      `,
      source,
    );

    expect(scriptEnumLifecycleDiagnostics({
      scriptModules: [{
        moduleName: "@minecraft/server",
        version: "2.0.0",
        track: "stable",
      }],
      educationMetadata: false,
    }, [script])).toEqual([]);
  });
});
