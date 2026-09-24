import type { SemanticGraph } from "../../graph/src/graph.js";
import type { ComponentKind } from "../../project-model/src/component.js";
import type {
  RepairCounterfactualImpact,
  RepairCounterfactualInput,
} from "./counterfactual-types.js";

function sorted<T extends string>(values: Iterable<T>): T[] {
  return [...new Set(values)].sort() as T[];
}

function impactTracesFrom(
  graph: SemanticGraph,
  changedNodeId: string,
): Array<{
  changedNodeId: string;
  affectedNodeId: string;
  nodePath: string[];
  edgePath: string[];
  depth: number;
}> {
  const output: Array<{
    changedNodeId: string;
    affectedNodeId: string;
    nodePath: string[];
    edgePath: string[];
    depth: number;
  }> = [];
  const queue: Array<{
    nodeId: string;
    nodePath: string[];
    edgePath: string[];
  }> = [{
    nodeId: changedNodeId,
    nodePath: [changedNodeId],
    edgePath: [],
  }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);

    output.push({
      changedNodeId,
      affectedNodeId: current.nodeId,
      nodePath: current.nodePath,
      edgePath: current.edgePath,
      depth: current.edgePath.length,
    });

    const incoming = graph.incomingEdges(current.nodeId)
      .filter((edge) => edge.status === "resolved")
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const edge of incoming) {
      if (visited.has(edge.from)) continue;
      queue.push({
        nodeId: edge.from,
        nodePath: [...current.nodePath, edge.from],
        edgePath: [...current.edgePath, edge.id],
      });
    }
  }

  return output;
}

export function analyzeRepairCounterfactual(
  graph: SemanticGraph,
  input: RepairCounterfactualInput,
): RepairCounterfactualImpact {
  const changedNodeIds = sorted(input.changedNodeIds);
  const unknownChangedNodeIds = changedNodeIds.filter(
    (id) => graph.getNode(id) === undefined,
  );

  const affected = new Set<string>();
  for (const id of changedNodeIds) {
    if (!graph.getNode(id)) continue;
    for (const impacted of graph.traceAffected(id)) {
      affected.add(impacted);
    }
  }

  const impactTraces = changedNodeIds
    .filter((id) => graph.getNode(id) !== undefined)
    .flatMap((id) => impactTracesFrom(graph, id))
    .sort((a, b) =>
      a.depth - b.depth ||
      a.changedNodeId.localeCompare(b.changedNodeId) ||
      a.affectedNodeId.localeCompare(b.affectedNodeId)
    );

  const affectedNodeIds = sorted(affected);
  const affectedPaths = sorted(
    affectedNodeIds
      .map((id) => graph.getNode(id)?.source.relativePath)
      .filter((value): value is string => value !== undefined),
  );
  const affectedKinds = sorted(
    affectedNodeIds
      .map((id) => graph.getNode(id)?.kind)
      .filter((value): value is ComponentKind => value !== undefined),
  );

  const affectedSet = new Set(affectedNodeIds);
  const unresolvedEdgeIds = sorted(
    graph.unresolvedEdges()
      .filter((edge) => affectedSet.has(edge.from))
      .map((edge) => edge.id),
  );
  const ambiguousEdgeIds = sorted(
    graph.ambiguousEdges()
      .filter((edge) =>
        affectedSet.has(edge.from) ||
        (edge.candidates ?? []).some((candidate) => affectedSet.has(candidate))
      )
      .map((edge) => edge.id),
  );

  const transactionPaths = new Set(input.transaction.affectedPaths);
  const changedPaths = changedNodeIds
    .map((id) => graph.getNode(id)?.source.relativePath)
    .filter((value): value is string => value !== undefined);
  const transactionCoversChangedPaths = changedPaths.every(
    (path) => transactionPaths.has(path),
  );
  const changedPathSet = new Set(changedPaths);
  const changedNodesCoverTransactionPaths = [...transactionPaths].every(
    (path) => changedPathSet.has(path),
  );

  return {
    transactionId: input.transaction.id,
    changedNodeIds,
    unknownChangedNodeIds,
    affectedNodeIds,
    affectedPaths,
    affectedKinds,
    impactTraces,
    maxImpactDepth: impactTraces.reduce(
      (maximum, trace) => Math.max(maximum, trace.depth),
      0,
    ),
    unresolvedEdgeIds,
    ambiguousEdgeIds,
    graphCoverageComplete:
      unknownChangedNodeIds.length === 0 &&
      unresolvedEdgeIds.length === 0 &&
      ambiguousEdgeIds.length === 0 &&
      transactionCoversChangedPaths &&
      changedNodesCoverTransactionPaths,
  };
}
