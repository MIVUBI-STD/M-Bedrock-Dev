import { parseMcFunction } from "../../../analyzers/functions/src/parse.js";
import { SemanticGraph } from "../../graph/src/graph.js";
import type { SemanticNode } from "../../graph/src/types.js";
import { semanticNodeId } from "../../project-model/src/identity.js";
import { populateFunctionEdges } from "../../../analyzers/references/src/populate-function-edges.js";
import type { SourceMutation } from "../../reliability-search/src/mutation-types.js";

export interface FunctionGraphFixtureFile {
  identifier: string;
  relativePath: string;
  commands: readonly string[];
}

export interface FunctionGraphMutationFixture {
  files: readonly FunctionGraphFixtureFile[];
}

function buildGraph(files: readonly FunctionGraphFixtureFile[]) {
  const graph = new SemanticGraph();
  const nodes: SemanticNode[] = [];
  const parsed = files.map((file) => {
    const node: SemanticNode = {
      id: semanticNodeId("function", "project", file.identifier),
      identity: {
        kind: "function",
        scope: "project",
        identifier: file.identifier,
      },
      kind: "function",
      identifier: file.identifier,
      source: {
        artifactId: "mutation_fixture",
        relativePath: file.relativePath,
      },
    };
    graph.addNode(node);
    nodes.push(node);
    return {
      node,
      parsed: parseMcFunction(
        file.identifier,
        file.commands.join("\n"),
        node.source,
      ),
    };
  });

  for (const item of parsed) {
    populateFunctionEdges(graph, item.node, item.parsed, nodes);
  }

  return graph;
}

export function detectFunctionGraphMutation(
  fixture: FunctionGraphMutationFixture,
  fileIdentifier: string,
  mutation: SourceMutation,
) {
  const target = fixture.files.find((file) => file.identifier === fileIdentifier);
  if (!target) {
    return {
      killed: false,
      invalid: true,
      evidence: `Function fixture not found: ${fileIdentifier}`,
    };
  }

  const matches = target.commands
    .map((command, index) => command === mutation.original ? index : -1)
    .filter((index) => index >= 0);
  if (matches.length !== 1) {
    return {
      killed: false,
      invalid: true,
      evidence: "Graph mutation requires exactly one matching source command.",
    };
  }

  const baseline = buildGraph(fixture.files);
  const mutatedFiles = fixture.files.map((file) => {
    if (file.identifier !== fileIdentifier) return file;
    const commands = [...file.commands];
    commands[matches[0]!] = mutation.mutated;
    return { ...file, commands };
  });
  const mutated = buildGraph(mutatedFiles);

  const beforeUnresolved = baseline.unresolvedEdges();
  const afterUnresolved = mutated.unresolvedEdges();

  if (afterUnresolved.length > beforeUnresolved.length) {
    const newTargets = afterUnresolved
      .map((edge) => edge.targetIdentifier)
      .filter((targetIdentifier) =>
        !beforeUnresolved.some((edge) => edge.targetIdentifier === targetIdentifier),
      );

    return {
      killed: true,
      evidence: `Function graph introduced unresolved edge(s): ${newTargets.join(", ") || "unknown target"}`,
    };
  }

  return {
    killed: false,
    evidence: "Function dependency graph did not distinguish mutant from baseline.",
  };
}
