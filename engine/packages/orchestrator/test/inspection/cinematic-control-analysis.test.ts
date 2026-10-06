import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeCinematicControl } from "../../src/inspection/cinematic-control-analysis.js";

describe("cinematic control analysis", () => {
  it("keeps camera cleanup and input coordination as separate surfaces", () => {
    const script = parseScriptFile(
      "main",
      [
        "function start(player) {",
        "  player.camera.setCamera('minecraft:free');",
        "  player.inputPermissions.movementEnabled = false;",
        "}",
        "function finish(player) {",
        "  player.camera.clear();",
        "  player.inputPermissions.movementEnabled = true;",
        "}",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    const result = analyzeCinematicControl([script]);
    expect(result.cameraSetCalls).toBe(1);
    expect(result.cameraClearCalls).toBe(1);
    expect(result.cameraCleanupStatus).toBe("clear-surface-present");
    expect(result.runtimeCompletionStatus).toBe("runtime-verification-required");
  });
});
