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

export interface ZeroWasteValidationOutcome {
  scenarioId: string;
  completed: boolean;
  evidenceIds?: readonly string[];
}

export interface ZeroWasteExecutionReceipt {
  schemaVersion: 1;
  transactionId: string;
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
  executionViolations: readonly string[];
  reasons: readonly string[];
}

function normalizedEvidence(
  values: readonly string[] | undefined,
): string[] {
  return [
    ...new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].sort();
}

function duplicateIds(
  values: readonly string[],
): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }

  return [...duplicates].sort();
}

export function createZeroWasteExecutionReceipt(
  plan: ZeroWasteWorkflowPlan,
  outcomes: readonly ZeroWasteProofActionOutcome[],
  validationOutcomes:
    readonly ZeroWasteValidationOutcome[] = [],
): ZeroWasteExecutionReceipt {
  const expectedClaimIds =
    new Set(
      plan.proofActions.map(
        (item) => item.claimId,
      ),
    );
  const expectedScenarioIds =
    new Set(
      plan.validation.selected.map(
        (item) => item.scenarioId,
      ),
    );

  const duplicateClaimIds =
    duplicateIds(
      outcomes.map(
        (item) => item.claimId,
      ),
    );
  const duplicateScenarioIds =
    duplicateIds(
      validationOutcomes.map(
        (item) => item.scenarioId,
      ),
    );

  const byClaim =
    new Map(
      outcomes.map((item) => [
        item.claimId,
        item,
      ]),
    );
  const outcomeIndex =
    new Map(
      outcomes.map((item, index) => [
        item.claimId,
        index,
      ]),
    );
  const validationByScenario =
    new Map(
      validationOutcomes.map(
        (item) => [
          item.scenarioId,
          item,
        ],
      ),
    );

  const missingActions =
    plan.proofActions
      .filter((action) => {
        const outcome =
          byClaim.get(
            action.claimId,
          );
        return (
          outcome === undefined ||
          outcome.action !==
            action.action ||
          outcome.completed !== true
        );
      })
      .map((item) => item.claimId)
      .sort();

  const missingValidation =
    plan.validation.selected
      .filter((scenario) =>
        validationByScenario
          .get(scenario.scenarioId)
          ?.completed !== true
      )
      .map(
        (item) => item.scenarioId,
      )
      .sort();

  const unexpectedClaimIds =
    outcomes
      .map((item) => item.claimId)
      .filter((id) =>
        !expectedClaimIds.has(id)
      )
      .sort();

  const unexpectedScenarioIds =
    validationOutcomes
      .map((item) => item.scenarioId)
      .filter((id) =>
        !expectedScenarioIds.has(id)
      )
      .sort();

  const missingProofEvidence =
    outcomes
      .filter(
        (item) =>
          item.completed === true &&
          normalizedEvidence(
            item.evidenceIds,
          ).length === 0,
      )
      .map((item) => item.claimId)
      .sort();

  const missingValidationEvidence =
    validationOutcomes
      .filter(
        (item) =>
          item.completed === true &&
          normalizedEvidence(
            item.evidenceIds,
          ).length === 0,
      )
      .map((item) => item.scenarioId)
      .sort();

  const dependencyViolations:
    string[] = [];

  for (
    const action of
      plan.proofActions
  ) {
    const actionOutcome =
      byClaim.get(action.claimId);
    const actionIndex =
      outcomeIndex.get(action.claimId);

    if (
      actionOutcome?.completed !== true ||
      actionIndex === undefined
    ) {
      continue;
    }

    for (
      const dependencyId of
        action.dependsOnClaimIds
    ) {
      const dependencyOutcome =
        byClaim.get(dependencyId);
      const dependencyIndex =
        outcomeIndex.get(
          dependencyId,
        );

      if (
        dependencyOutcome?.completed !==
        true
      ) {
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

  const executionViolations = [
    ...(duplicateClaimIds.length === 0
      ? []
      : [
          "Duplicate proof outcomes: " +
            duplicateClaimIds.join(", ") +
            ".",
        ]),
    ...(duplicateScenarioIds.length === 0
      ? []
      : [
          "Duplicate validation outcomes: " +
            duplicateScenarioIds.join(", ") +
            ".",
        ]),
    ...(unexpectedClaimIds.length === 0
      ? []
      : [
          "Unexpected proof outcomes: " +
            unexpectedClaimIds.join(", ") +
            ".",
        ]),
    ...(unexpectedScenarioIds.length ===
    0
      ? []
      : [
          "Unexpected validation outcomes: " +
            unexpectedScenarioIds.join(", ") +
            ".",
        ]),
    ...(missingProofEvidence.length === 0
      ? []
      : [
          "Completed proof outcomes require evidence: " +
            missingProofEvidence.join(", ") +
            ".",
        ]),
    ...(missingValidationEvidence.length ===
    0
      ? []
      : [
          "Completed validation outcomes require evidence: " +
            missingValidationEvidence.join(", ") +
            ".",
        ]),
  ];

  const evidenceIds = [
    ...new Set([
      ...outcomes.flatMap(
        (item) =>
          normalizedEvidence(
            item.evidenceIds,
          ),
      ),
      ...validationOutcomes.flatMap(
        (item) =>
          normalizedEvidence(
            item.evidenceIds,
          ),
      ),
    ]),
  ].sort();

  const completed =
    missingActions.length === 0 &&
    missingValidation.length === 0 &&
    dependencyViolations.length ===
      0 &&
    executionViolations.length === 0;

  return {
    schemaVersion: 1,
    transactionId:
      plan.transactionId,
    status:
      completed
        ? "complete"
        : "incomplete",
    reusedClaimIds:
      plan.proofActions
        .filter(
          (item) =>
            item.action === "reuse",
        )
        .map((item) => item.claimId)
        .sort(),
    recomputedClaimIds:
      plan.proofActions
        .filter(
          (item) =>
            item.action ===
            "recompute",
        )
        .map((item) => item.claimId)
        .sort(),
    restoredEvidenceClaimIds:
      plan.proofActions
        .filter(
          (item) =>
            item.action ===
            "restore-evidence",
        )
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
          (item) =>
            item.action === "reuse",
        ).length,
      validationScenarios:
        plan.validation.skipped.length,
      totalUnits:
        plan.proofActions.filter(
          (item) =>
            item.action === "reuse",
        ).length +
        plan.validation.skipped
          .length,
    },
    evidenceIds,
    dependencyViolations:
      dependencyViolations.sort(),
    executionViolations,
    reasons: completed
      ? [
          "Every planned proof action and selected validation scenario completed with explicit evidence; proof dependencies executed in order.",
        ]
      : [
          ...(missingActions.length === 0
            ? []
            : [
                "One or more planned proof actions are incomplete or mismatched: " +
                  missingActions.join(", ") +
                  ".",
              ]),
          ...(missingValidation.length ===
          0
            ? []
            : [
                "One or more selected validation scenarios are incomplete: " +
                  missingValidation.join(", ") +
                  ".",
              ]),
          ...(dependencyViolations.length ===
          0
            ? []
            : [
                "Proof dependency execution order is invalid: " +
                  dependencyViolations
                    .sort()
                    .join(" "),
              ]),
          ...executionViolations,
        ],
  };
}
