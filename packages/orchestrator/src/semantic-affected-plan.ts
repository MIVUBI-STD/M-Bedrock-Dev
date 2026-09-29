import {
  buildInvalidationPlan,
  type SemanticGraph,
} from "../../graph/src/index.js";
import type {
  PatchTransaction,
} from "../../repair/src/index.js";
import {
  deriveChangedSemanticNodeIds,
} from "./repair-changed-node-derivation.js";

export interface SemanticAffectedPlan {
  status: "planned" | "blocked";
  changedNodeIds: readonly string[];
  affectedNodeIds: readonly string[];
  skippedNodeIds: readonly string[];
  affectedPaths: readonly string[];
  totalNodeCount: number;
  changedNodeCount: number;
  affectedNodeCount: number;
  skippedNodeCount: number;
  skipRatio: number;
  reasons: readonly string[];
  unmatchedOperationPaths?: readonly string[];
}

function uniqueSorted(
  values: Iterable<string>,
): string[] {
  return [...new Set(values)].sort();
}

export function planSemanticAffectedSet(
  graph: SemanticGraph,
  changedNodeIds: readonly string[],
): SemanticAffectedPlan {
  const allNodes = graph.allNodes();
  const allNodeIds = new Set(
    allNodes.map((node) => node.id),
  );
  const changed =
    uniqueSorted(changedNodeIds);
  const missing = changed.filter(
    (id) => !allNodeIds.has(id),
  );

  if (missing.length > 0) {
    return {
      status: "blocked",
      changedNodeIds: changed,
      affectedNodeIds: [],
      skippedNodeIds: [],
      affectedPaths: [],
      totalNodeCount: allNodes.length,
      changedNodeCount: changed.length,
      affectedNodeCount: 0,
      skippedNodeCount: 0,
      skipRatio: 0,
      reasons: [
        "Semantic affected planning is blocked because changed node ids are absent from the current graph: " +
          missing.join(", ") +
          ".",
      ],
    };
  }

  const invalidation =
    buildInvalidationPlan(
      graph,
      changed,
    );
  const affectedNodeIds =
    uniqueSorted(invalidation.affected);
  const affectedSet =
    new Set(affectedNodeIds);
  const skippedNodeIds =
    allNodes
      .map((node) => node.id)
      .filter((id) =>
        !affectedSet.has(id)
      )
      .sort();
  const affectedPaths =
    uniqueSorted(
      allNodes
        .filter((node) =>
          affectedSet.has(node.id)
        )
        .map((node) =>
          node.source.relativePath
        ),
    );
  const skipRatio =
    allNodes.length === 0
      ? 0
      : skippedNodeIds.length /
        allNodes.length;

  return {
    status: "planned",
    changedNodeIds: changed,
    affectedNodeIds,
    skippedNodeIds,
    affectedPaths,
    totalNodeCount: allNodes.length,
    changedNodeCount: changed.length,
    affectedNodeCount:
      affectedNodeIds.length,
    skippedNodeCount:
      skippedNodeIds.length,
    skipRatio,
    reasons: [
      "Affected nodes include only changed semantic nodes and their reverse dependents.",
      skippedNodeIds.length === 0
        ? "No semantic nodes can be safely skipped for this change."
        : String(
            skippedNodeIds.length,
          ) +
          " of " +
          String(allNodes.length) +
          " semantic nodes are outside the affected dependency closure and can be skipped.",
    ],
  };
}

export function planPatchSemanticAffectedSet(
  graph: SemanticGraph,
  transaction: PatchTransaction,
): SemanticAffectedPlan {
  const derivation =
    deriveChangedSemanticNodeIds(
      graph,
      transaction,
    );

  if (
    derivation.unmatchedOperationPaths
      .length > 0
  ) {
    return {
      status: "blocked",
      changedNodeIds:
        derivation.changedNodeIds,
      affectedNodeIds: [],
      skippedNodeIds: [],
      affectedPaths: [],
      totalNodeCount:
        graph.allNodes().length,
      changedNodeCount:
        derivation.changedNodeIds.length,
      affectedNodeCount: 0,
      skippedNodeCount: 0,
      skipRatio: 0,
      unmatchedOperationPaths:
        derivation
          .unmatchedOperationPaths,
      reasons: [
        "Patch affected planning is blocked because every patch operation must bind to the current semantic graph before selective validation is allowed.",
        "Unmatched operation paths: " +
          derivation
            .unmatchedOperationPaths
            .join(", ") +
          ".",
      ],
    };
  }

  return planSemanticAffectedSet(
    graph,
    derivation.changedNodeIds,
  );
}
