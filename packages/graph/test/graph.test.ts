import { describe, expect, it } from "vitest";
import { SemanticGraph } from "../src/graph.js";

const source = {
  artifactId: "art_demo",
  relativePath: "functions/start.mcfunction",
};

describe("SemanticGraph", () => {
  it("indexes resolved dependencies in both directions", () => {
    const graph = new SemanticGraph();

    graph.addNode({
      id: "function:pack:start",
      kind: "function",
      identifier: "start",
      source,
    });

    graph.addNode({
      id: "structure:pack:arena",
      kind: "structure",
      identifier: "arena",
      source: {
        artifactId: "art_demo",
        relativePath: "structures/arena.mcstructure",
      },
    });

    graph.addEdge({
      from: "function:pack:start",
      type: "LOADS_STRUCTURE",
      targetIdentifier: "arena",
      status: "resolved",
      to: "structure:pack:arena",
      evidence: { source },
    });

    expect(graph.dependenciesOf("function:pack:start").map((node) => node.id)).toEqual([
      "structure:pack:arena",
    ]);

    expect(graph.dependentsOf("structure:pack:arena").map((node) => node.id)).toEqual([
      "function:pack:start",
    ]);
  });

  it("retains unresolved references", () => {
    const graph = new SemanticGraph();

    graph.addNode({
      id: "function:pack:start",
      kind: "function",
      identifier: "start",
      source,
    });

    graph.addEdge({
      from: "function:pack:start",
      type: "LOADS_STRUCTURE",
      targetIdentifier: "missing",
      status: "unresolved",
      evidence: { source },
    });

    expect(graph.unresolvedEdges()).toHaveLength(1);
  });

  it("traces reverse impact through dependents", () => {
    const graph = new SemanticGraph();

    for (const id of ["function:pack:a", "function:pack:b", "structure:pack:c"]) {
      graph.addNode({
        id,
        kind: id.startsWith("structure") ? "structure" : "function",
        identifier: id,
        source,
      });
    }

    graph.addEdge({
      from: "function:pack:a",
      type: "CALLS",
      targetIdentifier: "b",
      status: "resolved",
      to: "function:pack:b",
      evidence: { source },
    });

    graph.addEdge({
      from: "function:pack:b",
      type: "LOADS_STRUCTURE",
      targetIdentifier: "c",
      status: "resolved",
      to: "structure:pack:c",
      evidence: { source },
    });

    expect([...graph.traceAffected("structure:pack:c")].sort()).toEqual(
      ["function:pack:a", "function:pack:b", "structure:pack:c"].sort(),
    );
  });
});
