import { describe, expect, it } from "vitest";
import {
  deriveScriptDataFlowGraph,
} from "../../src/index.js";

describe("script dataflow capability", () => {
  it("derives assignment, argument, and return flow from script source", () => {
    const graph = deriveScriptDataFlowGraph([{
      path: "scripts/main.ts",
      text: [
        "function identity(value) { return value; }",
        "const source = 7;",
        "const result = identity(source);",
      ].join("\n"),
      source: {
        artifactId: "artifact:test",
        relativePath: "scripts/main.ts",
      },
    }]);

    expect(
      graph.edges.some(
        (edge) =>
          edge.kind === "assignment",
      ),
    ).toBe(true);
    expect(
      graph.edges.some(
        (edge) =>
          edge.kind === "argument",
      ),
    ).toBe(true);
    expect(
      graph.edges.some(
        (edge) =>
          edge.kind === "return",
      ),
    ).toBe(true);
  });
});
