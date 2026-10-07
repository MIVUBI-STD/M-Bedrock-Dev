import type {
  MapAuditOutputV2FindingReasoning,
} from "../map-audit-output-v2.js";

const CONFIDENCE_RANK = {
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3,
  proven: 4,
} as const;

export interface ReasoningMonotonicityIssue {
  causalLinkId: string;
  reason: string;
}

export function assessReasoningMonotonicity(
  previous: Readonly<Record<string, MapAuditOutputV2FindingReasoning>>,
  next: Readonly<Record<string, MapAuditOutputV2FindingReasoning>>,
): ReasoningMonotonicityIssue[] {
  const issues: ReasoningMonotonicityIssue[] = [];
  for (const [causalLinkId, before] of Object.entries(previous)) {
    const after = next[causalLinkId];
    if (!after) continue;
    if (
      CONFIDENCE_RANK[after.proofConfidence] <
      CONFIDENCE_RANK[before.proofConfidence] &&
      after.evidenceChain.every((id) => before.evidenceChain.includes(id))
    ) {
      issues.push({
        causalLinkId,
        reason:
          "Proof confidence decreased without a changed evidence chain; resolution must not silently downgrade stable evidence.",
      });
    }
    if (
      before.reportClassification === "PROVEN BUG" &&
      after.reportClassification !== "PROVEN BUG" &&
      after.evidenceChain.every((id) => before.evidenceChain.includes(id))
    ) {
      issues.push({
        causalLinkId,
        reason:
          "PROVEN BUG classification changed without new or changed evidence.",
      });
    }
  }
  return issues;
}
