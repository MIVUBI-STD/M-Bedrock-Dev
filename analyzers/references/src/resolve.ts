import type { SemanticNode } from "../../../packages/graph/src/index.js";

export interface ResolutionResult {
  status: "resolved" | "unresolved" | "ambiguous";
  to?: string;
  candidates?: string[];
}

export function resolveByIdentifier(
  nodes: readonly SemanticNode[],
  identifier: string,
): ResolutionResult {
  const matches = nodes.filter((node) => node.identifier === identifier);

  if (matches.length === 0) return { status: "unresolved" };
  if (matches.length === 1) return { status: "resolved", to: matches[0]!.id };

  return {
    status: "ambiguous",
    candidates: matches.map((node) => node.id).sort(),
  };
}
