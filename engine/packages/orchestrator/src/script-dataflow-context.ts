import {
  backwardDataFlowSlice,
  forwardDataFlowSlice,
  type DataFlowGraph,
  type DataFlowNode,
} from "../../dataflow/src/index.js";

export interface DataFlowContextSliceRequest {
  graph: DataFlowGraph;
  seedNodeIds: readonly string[];
  direction?: "backward" | "forward";
  maxNodes?: number;
  maxEdges?: number;
}

export interface CompiledDataFlowContextSlice {
  schemaVersion: 1;
  direction: "backward" | "forward";
  seedNodeIds: readonly string[];
  nodes: readonly DataFlowNode[];
  edges: readonly {
    id: string;
    from: string;
    to: string;
    kind: string;
    confidence: "exact" | "bounded";
  }[];
  unresolvedCount: number;
  unresolvedExamples: readonly {
    id: string;
    reason: string;
  }[];
  missingSeedNodeIds: readonly string[];
  omittedNodes: number;
  omittedEdges: number;
  complete: boolean;
}

function positive(
  value: number | undefined,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Data-flow slice budgets must be positive integers.");
  }
  return value;
}

export function compileDataFlowContextSlice(
  input: DataFlowContextSliceRequest,
): CompiledDataFlowContextSlice {
  const direction = input.direction ?? "backward";
  const maxNodes = positive(input.maxNodes, 32);
  const maxEdges = positive(input.maxEdges, 64);
  const nodeById = new Map(
    input.graph.nodes.map((node) => [node.id, node]),
  );
  const seedNodeIds = [
    ...new Set(input.seedNodeIds.filter((id) => id.trim().length > 0)),
  ].sort();
  const missingSeedNodeIds = seedNodeIds
    .filter((id) => !nodeById.has(id))
    .sort();
  const existingSeeds = seedNodeIds
    .filter((id) => nodeById.has(id));

  if (existingSeeds.length > maxNodes) {
    throw new Error(
      "Data-flow maxNodes is smaller than the explicit seed node set.",
    );
  }

  const raw = direction === "backward"
    ? backwardDataFlowSlice(input.graph, existingSeeds)
    : forwardDataFlowSlice(input.graph, existingSeeds);

  const required = new Set(existingSeeds);
  const optionalNodeIds = raw.nodeIds
    .filter((id) => !required.has(id))
    .sort();
  const selectedNodeIds = [
    ...existingSeeds,
    ...optionalNodeIds.slice(
      0,
      Math.max(0, maxNodes - existingSeeds.length),
    ),
  ];
  const selectedSet = new Set(selectedNodeIds);
  const selectedNodes = selectedNodeIds
    .map((id) => nodeById.get(id))
    .filter((node): node is DataFlowNode => node !== undefined)
    .sort((a, b) => a.id.localeCompare(b.id));

  const sliceEdgeIds = new Set(raw.edgeIds);
  const candidateEdges = input.graph.edges
    .filter((edge) =>
      sliceEdgeIds.has(edge.id) &&
      selectedSet.has(edge.from) &&
      selectedSet.has(edge.to)
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const selectedEdges = candidateEdges
    .slice(0, maxEdges)
    .map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      kind: edge.kind,
      confidence: edge.confidence,
    }));

  const selectedModules = new Set(
    selectedNodes.map((node) => node.modulePath),
  );
  const relevantUnresolved = input.graph.unresolved
    .filter((item) =>
      item.source === undefined ||
      selectedModules.has(item.source.relativePath)
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  const omittedNodes =
    Math.max(0, raw.nodeIds.length - selectedNodes.length);
  const omittedEdges =
    Math.max(0, candidateEdges.length - selectedEdges.length);

  return {
    schemaVersion: 1,
    direction,
    seedNodeIds,
    nodes: selectedNodes,
    edges: selectedEdges,
    unresolvedCount: relevantUnresolved.length,
    unresolvedExamples: relevantUnresolved
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        reason: item.reason,
      })),
    missingSeedNodeIds,
    omittedNodes,
    omittedEdges,
    complete:
      missingSeedNodeIds.length === 0 &&
      omittedNodes === 0 &&
      omittedEdges === 0,
  };
}
