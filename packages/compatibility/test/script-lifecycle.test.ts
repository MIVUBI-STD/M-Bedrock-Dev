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

  it("supports remove-and-reintroduce lifecycles", () => {
    const reintroduced = {
      deprecatedInMajor: 1,
      removedIn: "2.0.0",
      reintroducedIn: "2.6.0",
      sourceIds: ["official"],
    } as const;

    expect(evaluateScriptSymbolLifecycle(
      reintroduced,
      "1.19.0",
      "stable",
    ).state).toBe("deprecated");
    expect(evaluateScriptSymbolLifecycle(
      reintroduced,
      "2.0.0",
      "stable",
    ).state).toBe("removed");
    expect(evaluateScriptSymbolLifecycle(
      reintroduced,
      "2.5.0",
      "stable",
    ).state).toBe("removed");
    expect(evaluateScriptSymbolLifecycle(
      reintroduced,
      "2.6.0",
      "stable",
    ).state).toBe("active");
    expect(evaluateScriptSymbolLifecycle(
      reintroduced,
      "2.12.0-beta.1.26.60-preview.25",
      "beta",
    ).state).toBe("active");
  });

  it("supports removed-without-prior-deprecation transitions", () => {
    expect(evaluateScriptSymbolLifecycle({
      removedIn: "2.0.0",
      replacement: "GameMode.Adventure",
      sourceIds: ["official"],
    }, "1.19.0", "stable").state).toBe("active");

    expect(evaluateScriptSymbolLifecycle({
      removedIn: "2.0.0",
      replacement: "GameMode.Adventure",
      sourceIds: ["official"],
    }, "2.0.0", "stable").state).toBe("removed");
  });

  it("does not guess when the module track is unknown", () => {
    expect(evaluateScriptSymbolLifecycle(
      lifecycle,
      "latest",
      "unknown",
    ).state).toBe("unknown");
  });
});
