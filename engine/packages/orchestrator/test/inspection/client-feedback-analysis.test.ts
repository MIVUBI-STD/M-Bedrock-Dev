import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeTitleLifecycle } from "../../src/inspection/client-feedback-analysis.js";

describe("client feedback title lifecycle", () => {
  it("separates title timing, clear and reset operations", () => {
    const parsed = parseScriptFile(
      "main",
      [
        "player.runCommand('title @s times 10 40 10');",
        "player.runCommand('title @s title Victory');",
        "player.runCommand('title @s clear');",
        "player.runCommand('title @s reset');",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    expect(analyzeTitleLifecycle([parsed])[0]).toMatchObject({
      target: "@s",
      hasTimes: true,
      hasClear: true,
      hasReset: true,
      titleWrites: 1,
    });
  });
});
