import { createHash } from "node:crypto";
import type {
  SemanticEdge,
  SemanticGraph,
  SemanticNode,
} from "../../graph/src/index.js";
import type {
  SemanticProofClaim,
  SemanticProofKind,
} from "../../project-model/src/index.js";

export const SEMANTIC_PROOF_EVALUATOR_REVISION =
  "m-bedrock-semantic-proof-evaluator:2";

export interface SemanticProofReuseResult {
  status:
    | "reusable"
    | "stale"
    | "blocked";
  claimId: string;
  currentBasisFingerprint?: string;
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
        .sort(([left], [right]) =>
          left.localeCompare(right)
        )
        .map(([key, child]) => [
          key,
          canonical(child),
        ]),
    );
  }

  return value;
}

function hash(
  value: unknown,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify(
        canonical(value),
      ),
    )
    .digest("hex");
}

function nodeProjection(
  node: SemanticNode,
): unknown {
  return {
    id: node.id,
    identity: node.identity,
    kind: node.kind,
    identifier: node.identifier,
    source: {
      artifactId:
        node.source.artifactId,
      relativePath:
        node.source.relativePath,
      jsonPointer:
        node.source.jsonPointer ??
        null,
    },
    contentHash:
      node.contentHash ?? null,
    semanticHash:
      node.semanticHash ?? null,
    parserVersion:
      node.parserVersion ?? null,
    data:
      node.data ?? null,
  };
}

function edgeProjection(
  edge: SemanticEdge,
  nodesById: ReadonlyMap<string, SemanticNode>,
): unknown {
  const fromNode =
    nodesById.get(edge.from);
  const toNode =
    edge.to === undefined
      ? undefined
      : nodesById.get(edge.to);

  return {
    from: edge.from,
    fromContentHash:
      fromNode?.contentHash ?? null,
    fromSemanticHash:
      fromNode?.semanticHash ?? null,
    type: edge.type,
    targetIdentifier:
      edge.targetIdentifier,
    status: edge.status,
    to: edge.to ?? null,
    toContentHash:
      toNode?.contentHash ?? null,
    toSemanticHash:
      toNode?.semanticHash ?? null,
    candidates:
      [...(edge.candidates ?? [])]
        .sort(),
    evidence: {
      artifactId:
        edge.evidence.source
          .artifactId,
      relativePath:
        edge.evidence.source
          .relativePath,
      jsonPointer:
        edge.evidence.source
          .jsonPointer ?? null,
      range: edge.evidence.source
        .range ?? null,
    },
  };
}

function normalizedBasis(
  values: readonly string[],
): string[] {
  return [
    ...new Set(
      values.filter(
        (value) =>
          value.trim().length > 0,
      ),
    ),
  ].sort();
}

export function semanticProofBasisFingerprint(
  graph: SemanticGraph,
  basisNodeIds: readonly string[],
): string {
  const basis =
    normalizedBasis(
      basisNodeIds,
    );

  if (basis.length === 0) {
    throw new Error(
      "Semantic proof basis requires at least one semantic node id.",
    );
  }

  const allNodes =
    new Map(
      graph.allNodes().map(
        (node) => [
          node.id,
          node,
        ],
      ),
    );
  const missing =
    basis.filter(
      (id) =>
        !allNodes.has(id),
    );

  if (missing.length > 0) {
    throw new Error(
      "Semantic proof basis references node(s) absent from the current graph: " +
        missing.join(", ") +
        ".",
    );
  }

  const basisSet =
    new Set(basis);
  const nodes =
    basis.map(
      (id) =>
        nodeProjection(
          allNodes.get(id)!,
        ),
    );

  const edges =
    graph.allEdges()
      .filter((edge) =>
        basisSet.has(edge.from) ||
        (
          edge.to !== undefined &&
          basisSet.has(edge.to)
        )
      )
      .map((edge) =>
        edgeProjection(
          edge,
          allNodes,
        )
      )
      .sort((left, right) =>
        JSON.stringify(
          canonical(left),
        ).localeCompare(
          JSON.stringify(
            canonical(right),
          ),
        )
      );

  return hash({
    schemaVersion: 1,
    evaluatorRevision:
      SEMANTIC_PROOF_EVALUATOR_REVISION,
    basis,
    nodes,
    incidentEdges: edges,
  });
}

export function createSemanticProofClaim(
  input: {
    claimId: string;
    claimRevision: string;
    kind: SemanticProofKind;
    graph: SemanticGraph;
    basisNodeIds: readonly string[];
    evidenceIds: readonly string[];
    targetProfileFingerprint?: string;
  },
): SemanticProofClaim {
  if (!input.claimId.trim()) {
    throw new Error(
      "Semantic proof claim id must be non-empty.",
    );
  }
  if (
    !input.claimRevision.trim()
  ) {
    throw new Error(
      "Semantic proof claim revision must be non-empty.",
    );
  }

  const evidenceIds =
    normalizedBasis(
      input.evidenceIds,
    );

  if (evidenceIds.length === 0) {
    throw new Error(
      "Semantic proof claim requires at least one evidence id.",
    );
  }

  if (
    input.kind === "runtime" &&
    !input.targetProfileFingerprint?.trim()
  ) {
    throw new Error(
      "Runtime semantic proof claims require a targetProfileFingerprint.",
    );
  }

  const basisNodeIds =
    normalizedBasis(
      input.basisNodeIds,
    );

  return {
    schemaVersion: 1,
    claimId: input.claimId,
    claimRevision:
      input.claimRevision,
    kind: input.kind,
    basisNodeIds,
    basisFingerprint:
      semanticProofBasisFingerprint(
        input.graph,
        basisNodeIds,
      ),
    evidenceIds,
    ...(input
      .targetProfileFingerprint ===
    undefined
      ? {}
      : {
          targetProfileFingerprint:
            input
              .targetProfileFingerprint,
        }),
  };
}

export function assessSemanticProofReuse(
  claim: SemanticProofClaim,
  input: {
    graph: SemanticGraph;
    claimRevision: string;
    availableEvidenceIds: readonly string[];
    targetProfileFingerprint?: string;
  },
): SemanticProofReuseResult {
  if (
    claim.schemaVersion !== 1
  ) {
    return {
      status: "blocked",
      claimId: claim.claimId,
      reasons: [
        "Unsupported semantic proof claim schema version.",
      ],
    };
  }

  if (
    claim.evidenceIds.length === 0
  ) {
    return {
      status: "blocked",
      claimId: claim.claimId,
      reasons: [
        "Stored proof claim has no evidence ids.",
      ],
    };
  }

  const availableEvidenceIds =
    new Set(
      input.availableEvidenceIds,
    );
  const missingEvidenceIds =
    claim.evidenceIds.filter(
      (id) =>
        !availableEvidenceIds.has(id),
    );

  if (
    missingEvidenceIds.length > 0
  ) {
    return {
      status: "blocked",
      claimId: claim.claimId,
      reasons: [
        "Stored proof evidence is unavailable: " +
          missingEvidenceIds
            .sort()
            .join(", ") +
          ".",
      ],
    };
  }

  if (
    claim.claimRevision !==
    input.claimRevision
  ) {
    return {
      status: "stale",
      claimId: claim.claimId,
      reasons: [
        "Claim revision changed from " +
          claim.claimRevision +
          " to " +
          input.claimRevision +
          ".",
      ],
    };
  }

  if (
    claim.targetProfileFingerprint !==
    input.targetProfileFingerprint
  ) {
    return {
      status: "stale",
      claimId: claim.claimId,
      reasons: [
        "Target runtime profile changed since this proof was recorded.",
      ],
    };
  }

  let currentBasisFingerprint:
    string;

  try {
    currentBasisFingerprint =
      semanticProofBasisFingerprint(
        input.graph,
        claim.basisNodeIds,
      );
  } catch (error) {
    return {
      status: "blocked",
      claimId: claim.claimId,
      reasons: [
        error instanceof Error
          ? error.message
          : String(error),
      ],
    };
  }

  if (
    currentBasisFingerprint !==
    claim.basisFingerprint
  ) {
    return {
      status: "stale",
      claimId: claim.claimId,
      currentBasisFingerprint,
      reasons: [
        "Semantic proof basis changed; cached evidence cannot be reused.",
      ],
    };
  }

  return {
    status: "reusable",
    claimId: claim.claimId,
    currentBasisFingerprint,
    reasons: [
      "Claim revision, runtime profile, semantic basis nodes, and incident dependency edges are unchanged.",
      "Existing evidence may be reused without rerunning the proof.",
    ],
  };
}
