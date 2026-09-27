import type {
  GameplayIntentEdge,
  GameplayIntentEvidenceOrigin,
  GameplayIntentInvariant,
  GameplayIntentModel,
  GameplayIntentStatus,
} from "./types.js";

export type GameplayIntentHistoricalDisposition =
  | "stable"
  | "expanded"
  | "reduced"
  | "changed";

export interface GameplayIntentNodeStatusChange {
  id: string;
  before: GameplayIntentStatus;
  after: GameplayIntentStatus;
}

export interface GameplayIntentNodeEvidenceOriginChange {
  id: string;
  before: readonly GameplayIntentEvidenceOrigin[];
  after: readonly GameplayIntentEvidenceOrigin[];
}

export interface GameplayIntentInvariantChange {
  id: string;
  changedFields: readonly (
    | "statement"
    | "strength"
    | "status"
    | "subjects"
  )[];
}

export interface GameplayIntentModelComparison {
  disposition: GameplayIntentHistoricalDisposition;
  stable: {
    nodeIds: readonly string[];
    edgeKeys: readonly string[];
    invariantIds: readonly string[];
    unknownIds: readonly string[];
  };
  added: {
    nodeIds: readonly string[];
    edgeKeys: readonly string[];
    invariantIds: readonly string[];
    unknownIds: readonly string[];
  };
  removed: {
    nodeIds: readonly string[];
    edgeKeys: readonly string[];
    invariantIds: readonly string[];
    unknownIds: readonly string[];
  };
  nodeStatusChanges: readonly GameplayIntentNodeStatusChange[];
  nodeEvidenceOriginChanges:
    readonly GameplayIntentNodeEvidenceOriginChange[];
  invariantChanges: readonly GameplayIntentInvariantChange[];
  semanticallyStable: boolean;
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function edgeKey(edge: GameplayIntentEdge): string {
  return [
    edge.kind,
    edge.from,
    edge.to,
  ].join("::");
}

function sameStrings(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((value, index) => value === b[index]);
}

function evidenceOriginsForNode(
  model: GameplayIntentModel,
  nodeId: string,
): GameplayIntentEvidenceOrigin[] {
  const node = model.nodes.find((item) => item.id === nodeId);
  if (!node) return [];

  const evidenceById = new Map(
    model.evidence.map((item) => [item.id, item]),
  );
  return [
    ...new Set(
      node.evidenceIds
        .map((id) => evidenceById.get(id)?.origin)
        .filter(
          (origin): origin is GameplayIntentEvidenceOrigin =>
            origin !== undefined,
        ),
    ),
  ].sort();
}

function invariantChanges(
  before: GameplayIntentInvariant,
  after: GameplayIntentInvariant,
): GameplayIntentInvariantChange | undefined {
  const changedFields: GameplayIntentInvariantChange["changedFields"][number][] = [];

  if (before.statement !== after.statement) {
    changedFields.push("statement");
  }
  if (before.strength !== after.strength) {
    changedFields.push("strength");
  }
  if (before.status !== after.status) {
    changedFields.push("status");
  }
  if (!sameStrings(before.subjectIds, after.subjectIds)) {
    changedFields.push("subjects");
  }

  return changedFields.length === 0
    ? undefined
    : {
        id: before.id,
        changedFields,
      };
}

export function compareGameplayIntentModels(
  before: GameplayIntentModel,
  after: GameplayIntentModel,
): GameplayIntentModelComparison {
  const beforeNodes = new Map(
    before.nodes.map((node) => [node.id, node]),
  );
  const afterNodes = new Map(
    after.nodes.map((node) => [node.id, node]),
  );

  const beforeNodeIds = new Set(beforeNodes.keys());
  const afterNodeIds = new Set(afterNodes.keys());

  const stableNodeIds = sorted(
    [...beforeNodeIds].filter((id) => afterNodeIds.has(id)),
  );
  const addedNodeIds = sorted(
    [...afterNodeIds].filter((id) => !beforeNodeIds.has(id)),
  );
  const removedNodeIds = sorted(
    [...beforeNodeIds].filter((id) => !afterNodeIds.has(id)),
  );

  const nodeStatusChanges: GameplayIntentNodeStatusChange[] = [];
  const nodeEvidenceOriginChanges:
    GameplayIntentNodeEvidenceOriginChange[] = [];

  for (const id of stableNodeIds) {
    const beforeNode = beforeNodes.get(id)!;
    const afterNode = afterNodes.get(id)!;

    if (beforeNode.status !== afterNode.status) {
      nodeStatusChanges.push({
        id,
        before: beforeNode.status,
        after: afterNode.status,
      });
    }

    const beforeOrigins = evidenceOriginsForNode(before, id);
    const afterOrigins = evidenceOriginsForNode(after, id);
    if (!sameStrings(beforeOrigins, afterOrigins)) {
      nodeEvidenceOriginChanges.push({
        id,
        before: beforeOrigins,
        after: afterOrigins,
      });
    }
  }

  const beforeEdges = new Set(before.edges.map(edgeKey));
  const afterEdges = new Set(after.edges.map(edgeKey));
  const stableEdgeKeys = sorted(
    [...beforeEdges].filter((key) => afterEdges.has(key)),
  );
  const addedEdgeKeys = sorted(
    [...afterEdges].filter((key) => !beforeEdges.has(key)),
  );
  const removedEdgeKeys = sorted(
    [...beforeEdges].filter((key) => !afterEdges.has(key)),
  );

  const beforeInvariants = new Map(
    before.invariants.map((item) => [item.id, item]),
  );
  const afterInvariants = new Map(
    after.invariants.map((item) => [item.id, item]),
  );
  const beforeInvariantIds = new Set(beforeInvariants.keys());
  const afterInvariantIds = new Set(afterInvariants.keys());

  const stableInvariantIds = sorted(
    [...beforeInvariantIds].filter((id) =>
      afterInvariantIds.has(id)
    ),
  );
  const addedInvariantIds = sorted(
    [...afterInvariantIds].filter((id) =>
      !beforeInvariantIds.has(id)
    ),
  );
  const removedInvariantIds = sorted(
    [...beforeInvariantIds].filter((id) =>
      !afterInvariantIds.has(id)
    ),
  );

  const changedInvariants = stableInvariantIds
    .map((id) =>
      invariantChanges(
        beforeInvariants.get(id)!,
        afterInvariants.get(id)!,
      )
    )
    .filter(
      (
        item,
      ): item is GameplayIntentInvariantChange =>
        item !== undefined,
    );

  const beforeUnknownIds = new Set(
    before.unknowns.map((item) => item.id),
  );
  const afterUnknownIds = new Set(
    after.unknowns.map((item) => item.id),
  );
  const stableUnknownIds = sorted(
    [...beforeUnknownIds].filter((id) =>
      afterUnknownIds.has(id)
    ),
  );
  const addedUnknownIds = sorted(
    [...afterUnknownIds].filter((id) =>
      !beforeUnknownIds.has(id)
    ),
  );
  const removedUnknownIds = sorted(
    [...beforeUnknownIds].filter((id) =>
      !afterUnknownIds.has(id)
    ),
  );

  const hasAdditions =
    addedNodeIds.length > 0 ||
    addedEdgeKeys.length > 0 ||
    addedInvariantIds.length > 0 ||
    addedUnknownIds.length > 0;
  const hasRemovals =
    removedNodeIds.length > 0 ||
    removedEdgeKeys.length > 0 ||
    removedInvariantIds.length > 0 ||
    removedUnknownIds.length > 0;
  const hasChanges =
    nodeStatusChanges.length > 0 ||
    nodeEvidenceOriginChanges.length > 0 ||
    changedInvariants.length > 0;

  const semanticallyStable =
    !hasAdditions &&
    !hasRemovals &&
    !hasChanges;

  const disposition: GameplayIntentHistoricalDisposition =
    semanticallyStable
      ? "stable"
      : hasAdditions && !hasRemovals && !hasChanges
        ? "expanded"
        : hasRemovals && !hasAdditions && !hasChanges
          ? "reduced"
          : "changed";

  return {
    disposition,
    stable: {
      nodeIds: stableNodeIds,
      edgeKeys: stableEdgeKeys,
      invariantIds: stableInvariantIds,
      unknownIds: stableUnknownIds,
    },
    added: {
      nodeIds: addedNodeIds,
      edgeKeys: addedEdgeKeys,
      invariantIds: addedInvariantIds,
      unknownIds: addedUnknownIds,
    },
    removed: {
      nodeIds: removedNodeIds,
      edgeKeys: removedEdgeKeys,
      invariantIds: removedInvariantIds,
      unknownIds: removedUnknownIds,
    },
    nodeStatusChanges,
    nodeEvidenceOriginChanges,
    invariantChanges: changedInvariants,
    semanticallyStable,
  };
}
