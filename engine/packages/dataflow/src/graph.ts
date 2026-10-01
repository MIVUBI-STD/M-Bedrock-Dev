import type {
  DataFlowEdge,
  DataFlowGraph,
  DataFlowNode,
} from "./types.js";

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

export function validateDataFlowGraph(
  graph: DataFlowGraph,
): string[] {
  const errors: string[] = [];
  if (graph.schemaVersion !== 1) errors.push("DataFlowGraph schemaVersion must be 1.");

  const ids = new Set<string>();
  for (const node of graph.nodes) {
    if (!node.id.trim()) errors.push("DataFlow node id must be non-empty.");
    if (ids.has(node.id)) errors.push("Duplicate DataFlow node id: " + node.id);
    ids.add(node.id);
  }

  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) errors.push("Duplicate DataFlow edge id: " + edge.id);
    edgeIds.add(edge.id);
    if (!ids.has(edge.from)) errors.push("DataFlow edge references missing source node: " + edge.from);
    if (!ids.has(edge.to)) errors.push("DataFlow edge references missing target node: " + edge.to);
  }
  return errors;
}

function adjacency(
  graph: DataFlowGraph,
  reverse: boolean,
): Map<string, DataFlowEdge[]> {
  const map = new Map<string, DataFlowEdge[]>();
  for (const edge of graph.edges) {
    const key = reverse ? edge.to : edge.from;
    const list = map.get(key) ?? [];
    list.push(edge);
    map.set(key, list);
  }
  return map;
}

export interface DataFlowSlice {
  nodeIds: readonly string[];
  edgeIds: readonly string[];
}

function slice(
  graph: DataFlowGraph,
  seeds: readonly string[],
  reverse: boolean,
): DataFlowSlice {
  const adj = adjacency(graph, reverse);
  const seen = new Set<string>();
  const edgeIds = new Set<string>();
  const queue = [...seeds];

  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const edge of adj.get(id) ?? []) {
      edgeIds.add(edge.id);
      const next = reverse ? edge.from : edge.to;
      if (!seen.has(next)) queue.push(next);
    }
  }

  return {
    nodeIds: uniqueSorted(seen),
    edgeIds: uniqueSorted(edgeIds),
  };
}

export function backwardDataFlowSlice(
  graph: DataFlowGraph,
  sinkNodeIds: readonly string[],
): DataFlowSlice {
  return slice(graph, sinkNodeIds, true);
}

export function forwardDataFlowSlice(
  graph: DataFlowGraph,
  sourceNodeIds: readonly string[],
): DataFlowSlice {
  return slice(graph, sourceNodeIds, false);
}

export function dataFlowNodesBySymbol(
  graph: DataFlowGraph,
  symbol: string,
): DataFlowNode[] {
  return graph.nodes.filter((node) => node.symbol === symbol);
}
