import { createHash } from "node:crypto";
import type { SemanticGraph } from "../../graph/src/graph.js";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (
    typeof value === "object" &&
    value !== null
  ) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonical(child)]),
    );
  }
  return value;
}

export function semanticGraphFingerprint(
  graph: SemanticGraph,
): string {
  const payload = canonical({
    nodes: graph.allNodes(),
    edges: graph.allEdges(),
  });
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}
