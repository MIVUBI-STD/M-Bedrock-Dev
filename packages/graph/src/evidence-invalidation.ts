import type {
  EvidenceRevisionBinding,
} from "../../project-model/src/evidence-freshness.js";
import type {
  InvalidationPlan,
} from "./invalidation.js";

export interface EvidenceInvalidationResult {
  staleEvidenceIds: readonly string[];
  unaffectedEvidenceIds: readonly string[];
}

export function invalidateEvidenceByGraphPlan(
  plan: InvalidationPlan,
  evidence: readonly EvidenceRevisionBinding[],
): EvidenceInvalidationResult {
  const affected = new Set([
    ...plan.changed,
    ...plan.affected,
  ]);
  const stale: string[] = [];
  const unaffected: string[] = [];

  for (const item of evidence) {
    if (
      item.basisNodeIds.some((nodeId) =>
        affected.has(nodeId)
      )
    ) {
      stale.push(item.evidenceId);
    } else {
      unaffected.push(item.evidenceId);
    }
  }

  return {
    staleEvidenceIds: [...new Set(stale)].sort(),
    unaffectedEvidenceIds:
      [...new Set(unaffected)].sort(),
  };
}
