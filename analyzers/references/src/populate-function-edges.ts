import type { ParsedFunction } from "../../functions/src/types.js";
import { SemanticGraph } from "../../../packages/graph/src/graph.js";
import type { SemanticNode, EdgeType, SemanticEdge } from "../../../packages/graph/src/types.js";
import { resolveByIdentifier } from "./resolve.js";

function edgeTypeForReference(kind: ParsedFunction["references"][number]["kind"]): EdgeType {
  switch (kind) {
    case "function": return "CALLS";
    case "structure": return "LOADS_STRUCTURE";
    case "scoreboard-read": return "READS_SCOREBOARD";
    case "scoreboard-write": return "WRITES_SCOREBOARD";
    case "tag-read": return "READS_TAG";
    case "tag-write": return "WRITES_TAG";
  }
}

export function populateFunctionEdges(
  graph: SemanticGraph,
  sourceNode: SemanticNode,
  parsed: ParsedFunction,
  candidateNodes: readonly SemanticNode[],
): void {
  for (const ref of parsed.references) {
    const identifier =
      "target" in ref ? ref.target :
      "objective" in ref ? ref.objective :
      ref.tag;

    const compatible = candidateNodes.filter((node) => {
      if (ref.kind === "function") return node.kind === "function";
      if (ref.kind === "structure") return node.kind === "structure";
      if (ref.kind.startsWith("scoreboard")) return node.kind === "scoreboard_objective";
      return node.kind === "tag";
    });

    const resolution = resolveByIdentifier(compatible, identifier);
    const edge: Omit<SemanticEdge, "id"> = {
      from: sourceNode.id,
      type: edgeTypeForReference(ref.kind),
      targetIdentifier: identifier,
      status: resolution.status,
      evidence: { source: ref.source },
    };

    if (resolution.to) edge.to = resolution.to;
    if (resolution.candidates) edge.candidates = resolution.candidates;

    graph.addEdge(edge);
  }
}
