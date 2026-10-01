import { createHash } from "node:crypto";
import type {
  SemanticEdge,
  SemanticGraph,
  SemanticNode,
} from "../../../graph/src/index.js";
import type {
  SourceRef,
} from "../../../project-model/src/index.js";

export interface StaticGraphPreservationEnvelope {
  allowedNodeIds?: readonly string[];
  allowedPaths?: readonly string[];
}

export interface StaticGraphPreservationProof {
  status: "proven" | "blocked";
  beforeFingerprint: string;
  afterFingerprint: string;
  proofFingerprint?: string;
  addedNodeIds: readonly string[];
  removedNodeIds: readonly string[];
  changedOutsideEnvelopeNodeIds: readonly string[];
  changedIdentityNodeIds: readonly string[];
  edgeTopologyChanged: boolean;
  reasons: readonly string[];
}

function canonical(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (
    value !== null &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.entries(
        value as Record<string, unknown>,
      )
        .sort(([a], [b]) =>
          a.localeCompare(b)
        )
        .map(([key, child]) => [
          key,
          canonical(child),
        ]),
    );
  }
  return value;
}

function fingerprint(value: unknown): string {
  return createHash("sha256")
    .update(
      JSON.stringify(canonical(value)),
    )
    .digest("hex");
}

function normalizedSource(
  source: SourceRef,
): unknown {
  return {
    artifactId: source.artifactId,
    relativePath: source.relativePath,
    jsonPointer:
      source.jsonPointer ?? null,
  };
}

function stableNodeIdentity(
  node: SemanticNode,
): unknown {
  return {
    id: node.id,
    identity: node.identity,
    kind: node.kind,
    identifier: node.identifier,
    source: normalizedSource(node.source),
  };
}

function fullNodeProjection(
  node: SemanticNode,
): unknown {
  return {
    ...stableNodeIdentity(node) as Record<string, unknown>,
    contentHash: node.contentHash ?? null,
    semanticHash: node.semanticHash ?? null,
    parserVersion: node.parserVersion ?? null,
    data: node.data ?? null,
  };
}

function edgeProjection(
  edge: SemanticEdge,
): unknown {
  return {
    from: edge.from,
    type: edge.type,
    targetIdentifier:
      edge.targetIdentifier,
    status: edge.status,
    to: edge.to ?? null,
    candidates:
      [...(edge.candidates ?? [])].sort(),
    evidenceSource:
      normalizedSource(
        edge.evidence.source,
      ),
  };
}

function sortedProjection(
  values: readonly unknown[],
): unknown[] {
  return [...values].sort((left, right) =>
    JSON.stringify(canonical(left))
      .localeCompare(
        JSON.stringify(canonical(right)),
      )
  );
}

function allowedNode(
  node: SemanticNode,
  envelope: StaticGraphPreservationEnvelope,
): boolean {
  return (
    envelope.allowedNodeIds?.includes(
      node.id,
    ) === true ||
    envelope.allowedPaths?.includes(
      node.source.relativePath,
    ) === true
  );
}

function graphProjection(
  graph: SemanticGraph,
  envelope: StaticGraphPreservationEnvelope,
): unknown {
  return {
    nodes: graph.allNodes().map((node) =>
      allowedNode(node, envelope)
        ? stableNodeIdentity(node)
        : fullNodeProjection(node)
    ),
    edges: sortedProjection(
      graph.allEdges().map(edgeProjection),
    ),
  };
}

export function proveStaticGraphPreservation(
  before: SemanticGraph,
  after: SemanticGraph,
  envelope: StaticGraphPreservationEnvelope,
): StaticGraphPreservationProof {
  const beforeNodes = new Map(
    before.allNodes().map((node) => [
      node.id,
      node,
    ]),
  );
  const afterNodes = new Map(
    after.allNodes().map((node) => [
      node.id,
      node,
    ]),
  );

  const addedNodeIds = [
    ...afterNodes.keys(),
  ]
    .filter((id) => !beforeNodes.has(id))
    .sort();
  const removedNodeIds = [
    ...beforeNodes.keys(),
  ]
    .filter((id) => !afterNodes.has(id))
    .sort();

  const changedOutsideEnvelopeNodeIds:
    string[] = [];
  const changedIdentityNodeIds:
    string[] = [];

  for (const [id, left] of beforeNodes) {
    const right = afterNodes.get(id);
    if (!right) continue;

    if (
      fingerprint(stableNodeIdentity(left)) !==
        fingerprint(stableNodeIdentity(right))
    ) {
      changedIdentityNodeIds.push(id);
      continue;
    }

    if (
      !allowedNode(left, envelope) &&
      fingerprint(fullNodeProjection(left)) !==
        fingerprint(fullNodeProjection(right))
    ) {
      changedOutsideEnvelopeNodeIds.push(
        id,
      );
    }
  }

  const beforeEdges = sortedProjection(
    before.allEdges().map(edgeProjection),
  );
  const afterEdges = sortedProjection(
    after.allEdges().map(edgeProjection),
  );
  const edgeTopologyChanged =
    fingerprint(beforeEdges) !==
    fingerprint(afterEdges);

  const beforeProjection =
    graphProjection(before, envelope);
  const afterProjection =
    graphProjection(after, envelope);
  const beforeFingerprint =
    fingerprint(beforeProjection);
  const afterFingerprint =
    fingerprint(afterProjection);

  const reasons: string[] = [];
  if (addedNodeIds.length > 0) {
    reasons.push(
      "Post-repair graph added semantic node(s): " +
        addedNodeIds.join(", ") +
        ".",
    );
  }
  if (removedNodeIds.length > 0) {
    reasons.push(
      "Post-repair graph removed semantic node(s): " +
        removedNodeIds.join(", ") +
        ".",
    );
  }
  if (
    changedIdentityNodeIds.length > 0
  ) {
    reasons.push(
      "Post-repair graph changed semantic node identity/path outside the permitted content-change model: " +
        changedIdentityNodeIds
          .sort()
          .join(", ") +
        ".",
    );
  }
  if (
    changedOutsideEnvelopeNodeIds.length > 0
  ) {
    reasons.push(
      "Post-repair graph changed semantic node content outside the admitted repair envelope: " +
        changedOutsideEnvelopeNodeIds
          .sort()
          .join(", ") +
        ".",
    );
  }
  if (edgeTopologyChanged) {
    reasons.push(
      "Post-repair semantic edge topology changed; current repair envelope does not authorize graph topology changes.",
    );
  }

  const proven = reasons.length === 0;

  return {
    status: proven
      ? "proven"
      : "blocked",
    beforeFingerprint,
    afterFingerprint,
    ...(proven
      ? {
          proofFingerprint:
            fingerprint({
              envelope: {
                allowedNodeIds: [
                  ...new Set(
                    envelope.allowedNodeIds ?? [],
                  ),
                ].sort(),
                allowedPaths: [
                  ...new Set(
                    envelope.allowedPaths ?? [],
                  ),
                ].sort(),
              },
              beforeFingerprint,
              afterFingerprint,
            }),
        }
      : {}),
    addedNodeIds,
    removedNodeIds,
    changedOutsideEnvelopeNodeIds:
      changedOutsideEnvelopeNodeIds.sort(),
    changedIdentityNodeIds:
      changedIdentityNodeIds.sort(),
    edgeTopologyChanged,
    reasons: proven
      ? [
          "Semantic graph identity/topology is preserved and all content changes are confined to the admitted repair envelope.",
        ]
      : reasons,
  };
}
