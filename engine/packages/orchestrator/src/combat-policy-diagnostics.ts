import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../diagnostics/src/index.js";
import type {
  CombatPolicyAnalysis,
} from "./combat-policy-analysis.js";

export function combatPolicyDiagnostics(
  analysis: CombatPolicyAnalysis,
): DiagnosticFinding[] {
  if (
    !analysis.configured ||
    analysis.revivePolicyContradictions === 0
  ) {
    return [];
  }

  return [
    createDiagnostic({
      code:
        "COMBAT_REVIVE_POLICY_VIOLATION",
      severity: "medium",
      message:
        String(
          analysis.revivePolicyContradictions,
        ) +
        " observed revive anomaly event(s) contradict the authored combat policy.",
      data: {
        selfRevive:
          analysis
            .selfReviveContradictions,
        multipleRevivers:
          analysis
            .multipleReviverContradictions,
        staleRevive:
          analysis
            .staleReviveContradictions,
        reviveAfterDeath:
          analysis
            .reviveAfterDeathContradictions,
        invalidReviverObservations:
          analysis
            .invalidReviverObservations,
      },
    }),
  ];
}
