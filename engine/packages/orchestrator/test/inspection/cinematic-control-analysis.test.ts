import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeCinematicControls } from "../../src/inspection/cinematic-control-analysis.js";

describe("cinematic control analysis", () => {
  it("keeps camera calls and authored fade timing distinct", () => {
    const parsed = parseScriptFile(
      "main",
      'player.camera.fade({ fadeTime: { fadeInTime: 1, holdTime: 2, fadeOutTime: 1 } });',
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    const result = analyzeCinematicControls([parsed]);
    expect(result.cameraMethodCalls).toBeGreaterThan(0);
    expect(result.fadeCalls).toBe(1);
    expect(result.fadeTimingAuthored).toBe(1);
  });
});
