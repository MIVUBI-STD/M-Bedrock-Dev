import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../diagnostics/src/index.js";
import type {
  EconomyPolicyAnalysis,
} from "./economy-policy-analysis.js";

export function economyPolicyDiagnostics(
  analysis: EconomyPolicyAnalysis,
): DiagnosticFinding[] {
  if (!analysis.configured) return [];

  const conflicts =
    analysis.deathRewardOverlapPolicyConflicts +
    analysis.pickupCurrencyPolicyMismatch;

  const coverageGaps =
    analysis.deathRewardOverlapUnresolved +
    analysis.pickupCurrencyConsumeCoverageGaps +
    analysis.idempotencyCoverageGaps +
    analysis.staleDropCleanupCoverageGaps +
    analysis.inventoryFullPolicyGaps +
    analysis.pickupScopeValidationUnproven +
    analysis.terminalRewardResultCommitUnproven;

  const findings: DiagnosticFinding[] = [];

  if (conflicts > 0) {
    findings.push(
      createDiagnostic({
        code: "ECONOMY_POLICY_CONFLICT",
        severity: "medium",
        message:
          "Authored economy policy conflicts with one or more correlated reward/currency source paths.",
        data: {
          policyId: analysis.policyId,
          deathRewardOverlapPolicyConflicts:
            analysis.deathRewardOverlapPolicyConflicts,
          pickupCurrencyPolicyMismatch:
            analysis.pickupCurrencyPolicyMismatch,
        },
      }),
    );
  }

  if (coverageGaps > 0) {
    findings.push(
      createDiagnostic({
        code: "ECONOMY_POLICY_COVERAGE_GAP",
        severity: "minor",
        message:
          "Economy policy obligations remain unproven or only partially covered by current static/runtime evidence.",
        data: {
          policyId: analysis.policyId,
          deathRewardOverlapUnresolved:
            analysis.deathRewardOverlapUnresolved,
          pickupCurrencyConsumeCoverageGaps:
            analysis.pickupCurrencyConsumeCoverageGaps,
          idempotencyCoverageGaps:
            analysis.idempotencyCoverageGaps,
          staleDropCleanupCoverageGaps:
            analysis.staleDropCleanupCoverageGaps,
          inventoryFullPolicyGaps:
            analysis.inventoryFullPolicyGaps,
          pickupScopeValidationUnproven:
            analysis.pickupScopeValidationUnproven,
          terminalRewardResultCommitUnproven:
            analysis.terminalRewardResultCommitUnproven,
        },
      }),
    );
  }

  return findings;
}
