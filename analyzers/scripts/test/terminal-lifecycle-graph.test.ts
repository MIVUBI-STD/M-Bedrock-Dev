import { describe, expect, it } from "vitest";
import {
  deriveScriptTerminalLifecycleGraph,
} from "../src/terminal-lifecycle-graph.js";

describe("terminal lifecycle graph extraction", () => {
  it("extracts bounded terminal state transitions from explicit assignments", () => {
    const graph = deriveScriptTerminalLifecycleGraph(
      `
        function finishGame() {
          gameState = "finishing";
          gameState = "available";
        }
      `,
      {
        artifactId: "artifact:test",
        relativePath: "scripts/main.ts",
      },
    );

    expect(graph.transitions).toEqual([
      expect.objectContaining({
        from: "finishing",
        to: "available",
        trigger: "victory",
      }),
    ]);
  });
});
