import { describe, expect, it } from "vitest";
import { evaluateScriptSymbolLifecycle } from "../src/script-lifecycle.js";

const lifecycle = {
  deprecatedInMajor: 1,
  removedIn: "2.0.0",
  replacement: "Dimension.playSound",
  sourceIds: ["official"],
} as const;

describe("Script API symbol lifecycle", () => {
  it("marks documented 1.x legacy usage as deprecated", () => {
    expect(evaluateScriptSymbolLifecycle(
      lifecycle,
      "1.19.0",
      "stable",
    ).state).toBe("deprecated");
  });

  it("marks 2.x usage as removed, including prerelease tracks", () => {
    expect(evaluateScriptSymbolLifecycle(
      lifecycle,
      "2.0.0",
      "stable",
    ).state).toBe("removed");
    expect(evaluateScriptSymbolLifecycle(
      lifecycle,
      "2.12.0-beta.1.26.60-preview.25",
      "beta",
    ).state).toBe("removed");
  });

  it("does not guess when the module track is unknown", () => {
    expect(evaluateScriptSymbolLifecycle(
      lifecycle,
      "latest",
      "unknown",
    ).state).toBe("unknown");
  });
});
