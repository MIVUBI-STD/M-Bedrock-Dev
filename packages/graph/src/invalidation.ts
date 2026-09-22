import type { NodeId } from "./types.js";
import { SemanticGraph } from "./graph.js";

export interface InvalidationPlan {
  changed: ReadonlySet<NodeId>;
  affected: ReadonlySet<NodeId>;
}

export function buildInvalidationPlan(
  graph: SemanticGraph,
  changed: Iterable<NodeId>,
): InvalidationPlan {
  const changedSet = new Set(changed);
  const affected = new Set<NodeId>();

  for (const nodeId of changedSet) {
    for (const impacted of graph.traceAffected(nodeId)) {
      affected.add(impacted);
    }
  }

  return { changed: changedSet, affected };
}
