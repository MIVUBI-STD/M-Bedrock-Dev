import type {
  AuthorizedRepairApplyResult,
} from "./authorized-repair.js";

export type RepairLifecycleStage =
  | "not-authorized"
  | "apply-failed"
  | "rolled-back-after-validation-failure"
  | "rollback-failed"
  | "transitive-revalidation-pending"
  | "static-validated";

export interface RepairLifecycleState {
  transactionId: string;
  stage: RepairLifecycleStage;
  mutationPresent: boolean;
  localStaticValidationPassed: boolean;
  transitiveRevalidationComplete: boolean;
  runtimeVerificationComplete: boolean;
  packageVerificationComplete: boolean;
  releaseEligible: boolean;
  pendingNodeIds: readonly string[];
  pendingPaths: readonly string[];
  reasons: readonly string[];
}

export function repairLifecycleFromApplyResult(
  result: AuthorizedRepairApplyResult,
): RepairLifecycleState {
  const transactionId = result.proof.transactionId;

  switch (result.status) {
    case "not-authorized":
      return {
        transactionId,
        stage: "not-authorized",
        mutationPresent: false,
        localStaticValidationPassed: false,
        transitiveRevalidationComplete: false,
        runtimeVerificationComplete: false,
        packageVerificationComplete: false,
        releaseEligible: false,
        pendingNodeIds: [],
        pendingPaths: [],
        reasons: [...result.reasons],
      };

    case "apply-failed":
      return {
        transactionId,
        stage: "apply-failed",
        mutationPresent: false,
        localStaticValidationPassed: false,
        transitiveRevalidationComplete: false,
        runtimeVerificationComplete: false,
        packageVerificationComplete: false,
        releaseEligible: false,
        pendingNodeIds: [],
        pendingPaths: [],
        reasons: [
          result.apply.failure ?? "Patch transaction failed to apply.",
        ],
      };

    case "static-validation-failed":
      return {
        transactionId,
        stage: "rolled-back-after-validation-failure",
        mutationPresent: !result.rollback.ok,
        localStaticValidationPassed: false,
        transitiveRevalidationComplete: false,
        runtimeVerificationComplete: false,
        packageVerificationComplete: false,
        releaseEligible: false,
        pendingNodeIds: [],
        pendingPaths: [],
        reasons: [
          "Post-mutation static validation failed.",
          result.rollback.ok
            ? "Working-copy mutation was rolled back."
            : "Rollback did not complete.",
        ],
      };

    case "static-validation-failed-rollback-failed":
      return {
        transactionId,
        stage: "rollback-failed",
        mutationPresent: true,
        localStaticValidationPassed: false,
        transitiveRevalidationComplete: false,
        runtimeVerificationComplete: false,
        packageVerificationComplete: false,
        releaseEligible: false,
        pendingNodeIds: [],
        pendingPaths: [],
        reasons: [
          "Post-mutation validation failed and rollback also failed.",
          result.rollback.failure ?? "Rollback failure has no further detail.",
        ],
      };

    case "transitive-revalidation-pending":
      return {
        transactionId,
        stage: "transitive-revalidation-pending",
        mutationPresent: true,
        localStaticValidationPassed: true,
        transitiveRevalidationComplete: false,
        runtimeVerificationComplete: false,
        packageVerificationComplete: false,
        releaseEligible: false,
        pendingNodeIds: [...result.pendingNodeIds],
        pendingPaths: [...result.pendingPaths],
        reasons: [
          "Direct static validation passed, but transitive dependents remain unverified.",
        ],
      };

    case "validated":
      return {
        transactionId,
        stage: "static-validated",
        mutationPresent: true,
        localStaticValidationPassed: true,
        transitiveRevalidationComplete: true,
        runtimeVerificationComplete: false,
        packageVerificationComplete: false,
        releaseEligible: false,
        pendingNodeIds: [],
        pendingPaths: [],
        reasons: [
          "Static repair validation is complete.",
          "Runtime and package verification remain separate proof layers.",
        ],
      };
  }
}

export function markRepairRuntimeVerified(
  state: RepairLifecycleState,
): RepairLifecycleState {
  if (
    state.stage !== "static-validated" ||
    !state.localStaticValidationPassed ||
    !state.transitiveRevalidationComplete
  ) {
    throw new Error(
      "Runtime verification cannot be credited before static and transitive repair validation complete.",
    );
  }

  return {
    ...state,
    runtimeVerificationComplete: true,
    reasons: [
      ...state.reasons,
      "Runtime verification evidence has been accepted.",
    ],
  };
}

export function markRepairPackageVerified(
  state: RepairLifecycleState,
): RepairLifecycleState {
  if (
    state.stage !== "static-validated" ||
    !state.localStaticValidationPassed ||
    !state.transitiveRevalidationComplete
  ) {
    throw new Error(
      "Package verification cannot be credited before repair validation complete.",
    );
  }

  return {
    ...state,
    packageVerificationComplete: true,
    releaseEligible:
      state.runtimeVerificationComplete,
    reasons: [
      ...state.reasons,
      "Package verification evidence has been accepted.",
    ],
  };
}

export function repairReleaseEligible(
  state: RepairLifecycleState,
): boolean {
  return (
    state.stage === "static-validated" &&
    state.localStaticValidationPassed &&
    state.transitiveRevalidationComplete &&
    state.runtimeVerificationComplete &&
    state.packageVerificationComplete
  );
}
