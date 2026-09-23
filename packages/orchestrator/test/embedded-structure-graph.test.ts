import { describe, expect, it } from "vitest";
import { SemanticGraph } from "../../graph/src/graph.js";
import type { SemanticNode } from "../../graph/src/types.js";
import { analyzeEmbeddedStructureCommands } from "../src/embedded-structure-commands.js";
import { populateEmbeddedStructureCommandGraph } from "../src/embedded-structure-graph.js";

const source = {
  artifactId: "fixture",
  relativePath: "structures/demo/arena.mcstructure",
};

describe("embedded structure command graph", () => {
  it("connects embedded function calls to function nodes", () => {
    const graph = new SemanticGraph();
    const structureNode: SemanticNode = {
      id: "structure:project:demo:arena",
      identity: { kind: "structure", scope: "project", identifier: "demo:arena" },
      kind: "structure",
      identifier: "demo:arena",
      source,
    };
    const functionNode: SemanticNode = {
      id: "function:project:demo:start",
      identity: { kind: "function", scope: "project", identifier: "demo:start" },
      kind: "function",
      identifier: "demo:start",
      source: { artifactId: "fixture", relativePath: "functions/start.mcfunction" },
    };

    graph.addNode(structureNode);
    graph.addNode(functionNode);
    const nodes = [structureNode, functionNode];

    const analyses = analyzeEmbeddedStructureCommands([{
      flatIndex: 2,
      command: "function demo:start",
    }], source);

    const commands = populateEmbeddedStructureCommandGraph(
      graph,
      structureNode,
      "demo:arena",
      analyses,
      nodes,
    );

    expect(commands).toHaveLength(1);
    expect(graph.dependenciesOf(commands[0]!.id).map((item) => item.id))
      .toContain(functionNode.id);
    expect(graph.dependenciesOf(structureNode.id).map((item) => item.id))
      .toContain(commands[0]!.id);
  });
});
