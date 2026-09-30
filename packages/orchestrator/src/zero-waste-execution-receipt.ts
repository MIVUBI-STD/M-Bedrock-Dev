import type {
  ZeroWasteProofAction,
  ZeroWasteWorkflowPlan,
} from "./zero-waste-workflow.js";

export interface ZeroWasteProofActionOutcome {
  claimId: string;
  action: ZeroWasteProofAction["action"];
  completed: boolean;
  evidenceIds?: readonly string[];
}

export interface ZeroWasteExecutionReceipt {
  schemaVersion: 1;
  status: "complete" | "incomplete";
  reusedClaimIds: readonly string[];
  recomputedClaimIds: readonly string[];
  restoredEvidenceClaimIds: readonly string[];
  skippedValidationScenarioIds: readonly string[];
  selectedValidationScenarioIds: readonly string[];
  evidenceIds: readonly string[];
  reasons: readonly string[];
}

export function createZeroWasteExecutionReceipt(
  plan: ZeroWasteWorkflowPlan,
  outcomes: readonly ZeroWasteProofActionOutcome[],
): ZeroWasteExecutionReceipt {
  const byClaim = new Map(
    outcomes.map((item) => [item.claimId, item]),
  );
  const missingActions = plan.proofActions
    .filter((action) => {
      const outcome = byClaim.get(action.claimId);
      return (
        outcome === undefined ||
        outcome.action !== action.action ||
        outcome.completed !== true
      );
    })
    .map((item) => item.claimId)
    .sort();

  const evidenceIds = [
    ...new Set(
      outcomes.flatMap(
        (item) => item.evidenceIds ?? [],
      ),
    ),
  ].sort();

  const completed = missingActions.length === 0;

  return {
    schemaVersion: 1,
    status: completed ? "complete" : "incomplete",
    reusedClaimIds: plan.proofActions
      .filter((item) => item.action === "reuse")
      .map((item) => item.claimId)
      .sort(),
    recomputedClaimIds: plan.proofActions
      .filter((item) => item.action === "recompute")
      .map((item) => item.claimId)
      .sort(),
    restoredEvidenceClaimIds: plan.proofActions
      .filter((item) => item.action === "restore-evidence")
      .map((item) => item.claimId)
      .sort(),
    skippedValidationScenarioIds:
      plan.validation.skipped
        .map((item) => item.scenarioId)
        .sort(),
    selectedValidationScenarioIds:
      plan.validation.selected
        .map((item) => item.scenarioId)
        .sort(),
    evidenceIds,
    reasons: completed
      ? [
          "Every planned proof action completed and selective validation routing is recorded.",
        ]
      : [
          "One or more planned proof actions are incomplete or mismatched: " +
            missingActions.join(", ") +
            ".",
        ],
  };
}
