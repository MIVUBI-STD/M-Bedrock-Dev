import type {
  DataFlowEdge,
  DataFlowGraph,
} from "./types.js";

export interface DataFlowTaintSeed {
  nodeId: string;
  label: string;
}

export interface DataFlowTaintRequest {
  graph: DataFlowGraph;
  seeds: readonly DataFlowTaintSeed[];
  barrierNodeIds?: readonly string[];
  maxStates?: number;
}

export interface DataFlowTaintReach {
  nodeId: string;
  labels: readonly string[];
}

export interface DataFlowTaintResult {
  reached: readonly DataFlowTaintReach[];
  missingSeedNodeIds: readonly string[];
  truncated: boolean;
  visitedStates: number;
}

export interface DataFlowTaintWitness {
  label: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeIds: readonly string[];
}

function positive(
  value: number | undefined,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Data-flow taint maxStates must be a positive integer.");
  }
  return value;
}

function adjacency(
  graph: DataFlowGraph,
): Map<string, DataFlowEdge[]> {
  const map = new Map<string, DataFlowEdge[]>();
  for (const edge of graph.edges) {
    const list = map.get(edge.from) ?? [];
    list.push(edge);
    map.set(edge.from, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }
  return map;
}

export function propagateDataFlowTaint(
  input: DataFlowTaintRequest,
): DataFlowTaintResult {
  const maxStates = positive(input.maxStates, 10000);
  const nodeIds = new Set(
    input.graph.nodes.map((node) => node.id),
  );
  const barriers = new Set(input.barrierNodeIds ?? []);
  const missingSeedNodeIds = [
    ...new Set(
      input.seeds
        .filter((seed) => !nodeIds.has(seed.nodeId))
        .map((seed) => seed.nodeId),
    ),
  ].sort();
  const queue = input.seeds
    .filter(
      (seed) =>
        nodeIds.has(seed.nodeId) &&
        seed.label.trim().length > 0,
    )
    .map((seed) => ({
      nodeId: seed.nodeId,
      label: seed.label,
    }));
  const graph = adjacency(input.graph);
  const seen = new Set<string>();
  const labelsByNode =
    new Map<string, Set<string>>();
  let cursor = 0;
  let truncated = false;

  while (cursor < queue.length) {
    if (seen.size >= maxStates) {
      truncated = true;
      break;
    }

    const state = queue[cursor++]!;
    const key =
      state.label + "\u0000" + state.nodeId;
    if (seen.has(key)) continue;
    seen.add(key);

    const labels =
      labelsByNode.get(state.nodeId) ??
      new Set<string>();
    labels.add(state.label);
    labelsByNode.set(state.nodeId, labels);

    if (barriers.has(state.nodeId)) {
      continue;
    }

    for (const edge of
      graph.get(state.nodeId) ?? []) {
      const nextKey =
        state.label + "\u0000" + edge.to;
      if (!seen.has(nextKey)) {
        queue.push({
          nodeId: edge.to,
          label: state.label,
        });
      }
    }
  }

  return {
    reached: [...labelsByNode.entries()]
      .map(([nodeId, labels]) => ({
        nodeId,
        labels: [...labels].sort(),
      }))
      .sort((a, b) =>
        a.nodeId.localeCompare(b.nodeId)
      ),
    missingSeedNodeIds,
    truncated,
    visitedStates: seen.size,
  };
}

export function shortestDataFlowTaintWitness(
  graph: DataFlowGraph,
  seed: DataFlowTaintSeed,
  targetNodeId: string,
  barrierNodeIds: readonly string[] = [],
): DataFlowTaintWitness | undefined {
  const nodeIds = new Set(
    graph.nodes.map((node) => node.id),
  );
  if (
    !nodeIds.has(seed.nodeId) ||
    !nodeIds.has(targetNodeId) ||
    !seed.label.trim()
  ) {
    return undefined;
  }

  const barriers =
    new Set(barrierNodeIds);
  const adj = adjacency(graph);
  const queue: Array<{
    nodeId: string;
    edgeIds: readonly string[];
  }> = [{
    nodeId: seed.nodeId,
    edgeIds: [],
  }];
  const seen =
    new Set<string>([seed.nodeId]);
  let cursor = 0;

  while (cursor < queue.length) {
    const current = queue[cursor++]!;
    if (current.nodeId === targetNodeId) {
      return {
        label: seed.label,
        sourceNodeId: seed.nodeId,
        targetNodeId,
        edgeIds: current.edgeIds,
      };
    }

    if (barriers.has(current.nodeId)) {
      continue;
    }

    for (const edge of
      adj.get(current.nodeId) ?? []) {
      if (seen.has(edge.to)) continue;
      seen.add(edge.to);
      queue.push({
        nodeId: edge.to,
        edgeIds: [
          ...current.edgeIds,
          edge.id,
        ],
      });
    }
  }

  return undefined;
}
