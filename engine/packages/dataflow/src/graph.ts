import type { SourceRef, SourceSequentialSite } from "../../project-model/src/index.js";
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


// Same-block, direct Minecraft-world writes are a bounded source-level kill:
// a later direct write supersedes earlier candidate writes on the identical
// unshadowed ESM world binding. This is NOT SSA, cross-callback ordering,
// proof that any call succeeded, or a general alias analysis.
function sameSourceBlock(a: SourceRef, b: SourceRef): boolean {
  const x = a.range, y = b.range;
  return a.artifactId === b.artifactId &&
    a.relativePath === b.relativePath &&
    a.jsonPointer === b.jsonPointer &&
    x?.lineStart !== undefined && y?.lineStart !== undefined &&
    x.columnStart !== undefined && y.columnStart !== undefined &&
    x.lineEnd !== undefined && y.lineEnd !== undefined &&
    x.columnEnd !== undefined && y.columnEnd !== undefined &&
    x.lineStart === y.lineStart && x.columnStart === y.columnStart &&
    x.lineEnd === y.lineEnd && x.columnEnd === y.columnEnd;
}

export function retainSourceSequentialWriteCandidates<T extends {
  id: string;
  sourceSequence?: SourceSequentialSite;
}>(
  readSite: SourceSequentialSite | undefined,
  candidates: readonly T[],
): T[] {
  if (!readSite?.stableWorldReceiver) return [...candidates];
  const definitePrior = candidates.filter(item => {
    const site = item.sourceSequence;
    return site?.stableWorldReceiver === true &&
      site.directCall && sameSourceBlock(site.block, readSite.block) &&
      site.statementIndex < readSite.statementIndex;
  });
  if (definitePrior.length === 0) return [...candidates];
  const latest = Math.max(...definitePrior.map(item =>
    item.sourceSequence!.statementIndex));
  // Candidates from another lexical block, unknown identity or non-direct
  // operations are preserved rather than incorrectly excluded.
  return candidates.filter(item => {
    const site = item.sourceSequence;
    return !(
      site?.stableWorldReceiver === true &&
      sameSourceBlock(site.block, readSite.block) &&
      site.statementIndex < latest
    );
  });
}
