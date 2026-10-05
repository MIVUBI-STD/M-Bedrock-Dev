import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzePlayerCapabilitySurfaces } from "../../src/inspection/player-capability-surface-analysis.js";

describe("player capability surface analysis", () => {
  it("detects privileged bypass and inactive protection definitions", () => {
    const text = [
      "class AntiCheatManager { start() {} }",
      "class ArenaService {",
      "  isAdmin(player) { return player.hasTag('admin'); }",
      "  canBuild(player) { if (this.isAdmin(player)) return true; return false; }",
      "}",
    ].join("\n");
    const parsed = parseScriptFile(
      "main",
      text,
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzePlayerCapabilitySurfaces([
      { parsed, text },
    ]);

    expect(result.privilegedGuardReferences).toBeGreaterThan(0);
    expect(result.privilegedBypassReturns).toBeGreaterThan(0);
    expect(result.inactiveProtectionDefinitions).toBe(1);
  });

  it("marks a protection class active when instantiated", () => {
    const text = [
      "class AntiCheatManager { start() {} }",
      "const antiCheat = new AntiCheatManager();",
      "antiCheat.start();",
    ].join("\n");
    const parsed = parseScriptFile(
      "main",
      text,
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzePlayerCapabilitySurfaces([
      { parsed, text },
    ]);

    expect(result.inactiveProtectionDefinitions).toBe(0);
    expect(result.protectionDefinitions[0]?.instantiated).toBe(true);
  });
});
