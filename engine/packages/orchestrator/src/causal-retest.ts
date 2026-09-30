import type { CausalComparison } from "./causal-comparison.js";
import type { RetestReason } from "../../reliability/src/index.js";

export function causalRetestReasons(
  comparison: CausalComparison,
): RetestReason[] {
  const reasons: RetestReason[] = [];

  if (comparison.delta.observedOutcomes > 0) {
    reasons.push({
      kind: "causal-regression",
      detail:
        "Observed downstream causal outcomes increased by " +
        comparison.delta.observedOutcomes +
        ".",
      weight: 5,
    });
  }

  if (comparison.delta.highConfidence > 0) {
    reasons.push({
      kind: "causal-regression",
      detail:
        "High-confidence causal chains increased by " +
        comparison.delta.highConfidence +
        ".",
      weight: 4,
    });
  }

  if (comparison.delta.addedCandidateLabels.length > 0) {
    reasons.push({
      kind: "causal-regression",
      detail:
        "New root-cause candidates: " +
        comparison.delta.addedCandidateLabels.join(", "),
      weight: 3,
    });
  }

  if (comparison.delta.corroboratedRisks > 0) {
    reasons.push({
      kind: "causal-regression",
      detail:
        "Corroborated runtime risks increased by " +
        comparison.delta.corroboratedRisks +
        ".",
      weight: 2,
    });
  }

  return reasons.sort(
    (a, b) => b.weight - a.weight || a.detail.localeCompare(b.detail),
  );
}
