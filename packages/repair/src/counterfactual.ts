import type { SemanticGraph } from "../../graph/src/graph.js";
import type { ComponentKind } from "../../project-model/src/component.js";
import type {
  RepairCounterfactualImpact,
  RepairCounterfactualInput,
} from "./counterfactual-types.js";

function sorted<T extends string>(values: Iterable<T>): T[] {
  return [...new Set(values)].sort() as T[];
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
