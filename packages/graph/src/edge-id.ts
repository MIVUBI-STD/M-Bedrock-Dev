import { createHash } from "node:crypto";
import type { SemanticEdge } from "./types.js";

export function semanticEdgeId(
  edge: Omit<SemanticEdge, "id">,
): string {
  const payload = JSON.stringify({
    from: edge.from,
    type: edge.type,
    targetIdentifier: edge.targetIdentifier,
    status: edge.status,
    to: edge.to ?? null,
    candidates: edge.candidates ?? [],
    artifactId: edge.evidence.source.artifactId,
    path: edge.evidence.source.relativePath,
    range: edge.evidence.source.range ?? null,
    jsonPointer: edge.evidence.source.jsonPointer ?? null,
  });

  return `edge_${createHash("sha256").update(payload).digest("hex").slice(0, 20)}`;
}
