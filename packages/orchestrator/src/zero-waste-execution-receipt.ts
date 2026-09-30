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
  avoidedWork: {
    proofExecutions: number;
    validationScenarios: number;
    totalUnits: number;
  };
  evidenceIds: readonly string[];
  dependencyViolations: readonly string[];
  reasons: readonly string[];
}

export function createZeroWasteExecutionReceipt(
  plan: ZeroWasteWorkflowPlan,
  outcomes: readonly ZeroWasteProofActionOutcome[],
): ZeroWasteExecutionReceipt {
  const byClaim = new Map(
    outcomes.map((item) => [item.claimId, item]),
  );
  const outcomeIndex = new Map(
    outcomes.map((item, index) => [
      item.claimId,
      index,
    ]),
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

  const dependencyViolations: string[] = [];

  for (const action of plan.proofActions) {
    const actionOutcome = byClaim.get(action.claimId);
    const actionIndex = outcomeIndex.get(action.claimId);

    if (
      actionOutcome?.completed !== true ||
      actionIndex === undefined
    ) {
      continue;
    }

    for (const dependencyId of action.dependsOnClaimIds) {
      const dependencyOutcome =
        byClaim.get(dependencyId);
      const dependencyIndex =
        outcomeIndex.get(dependencyId);

      if (dependencyOutcome?.completed !== true) {
        dependencyViolations.push(
          action.claimId +
            " executed without completed dependency " +
            dependencyId +
            ".",
        );
        continue;
      }

      if (
        dependencyIndex === undefined ||
        dependencyIndex >= actionIndex
      ) {
        dependencyViolations.push(
          action.claimId +
            " executed before dependency " +
            dependencyId +
            " completed.",
        );
      }
    }
  }

  const evidenceIds = [
    ...new Set(
      outcomes.flatMap(
        (item) => item.evidenceIds ?? [],
      ),
    ),
  ].sort();

  const completed =
    missingActions.length === 0 &&
    dependencyViolations.length === 0;

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
    avoidedWork: {
      proofExecutions:
        plan.proofActions.filter(
          (item) => item.action === "reuse",
        ).length,
      validationScenarios:
        plan.validation.skipped.length,
      totalUnits:
        plan.proofActions.filter(
          (item) => item.action === "reuse",
        ).length +
        plan.validation.skipped.length,
    },
    evidenceIds,
    dependencyViolations:
      dependencyViolations.sort(),
    reasons: completed
      ? [
          "Every planned proof action completed in dependency order and selective validation routing is recorded.",
        ]
      : [
          ...(missingActions.length === 0
            ? []
            : [
                "One or more planned proof actions are incomplete or mismatched: " +
                  missingActions.join(", ") +
                  ".",
              ]),
          ...(dependencyViolations.length === 0
            ? []
            : [
                "Proof dependency execution order is invalid: " +
                  dependencyViolations.sort().join(" "),
              ]),
        ],
  };
}
