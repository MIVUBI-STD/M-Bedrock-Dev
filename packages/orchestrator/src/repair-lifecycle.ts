import type {
  RuntimeVerificationExperimentContract,
} from "../../project-model/src/index.js";
import {
  runtimeVerificationExperimentContractCompatible,
  runtimeVerificationExperimentContractsFromProvenance,
} from "../../project-model/src/index.js";
import type {
  PreservationVerificationReceipt,
} from "../../preservation/src/index.js";
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

export interface TransitiveRevalidationReceipt {
  transactionId: string;
  passed: boolean;
  validatedNodeIds: readonly string[];
  validatedPaths: readonly string[];
  evidenceIds: readonly string[];
}

export interface RepairVerificationReceipt {
  transactionId: string;
  kind: "runtime" | "package";
  passed: boolean;
  evidenceIds: readonly string[];
  runtimeExperimentContract?: RuntimeVerificationExperimentContract;
}

export interface RepairLifecycleState {
  transactionId: string;
  stage: RepairLifecycleStage;
  mutationPresent: boolean;
  localStaticValidationPassed: boolean;
  transitiveRevalidationComplete: boolean;
  runtimeVerificationComplete: boolean;
  preservationVerificationComplete: boolean;
  packageVerificationComplete: boolean;
  runtimeVerificationContract?: RuntimeVerificationExperimentContract;
  authorizingRuntimeExperimentContracts?: readonly RuntimeVerificationExperimentContract[];
  pendingNodeIds: readonly string[];
  pendingPaths: readonly string[];
  reasons: readonly string[];
}

export function repairLifecycleFromApplyResult(
  result: AuthorizedRepairApplyResult,
): RepairLifecycleState {
  const transactionId = result.proof.transactionId;

  const authorizingRuntimeExperimentContracts =
    runtimeVerificationExperimentContractsFromProvenance(
      result.proof.causalInterventionProvenance ?? [],
    );

  switch (result.status) {
    case "not-authorized":
      return {
        transactionId,
        stage: "not-authorized",
        mutationPresent: false,
        localStaticValidationPassed: false,
        transitiveRevalidationComplete: false,
        runtimeVerificationComplete: false,
        preservationVerificationComplete: false,
        packageVerificationComplete: false,
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
        preservationVerificationComplete: false,
        packageVerificationComplete: false,
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
        preservationVerificationComplete: false,
        packageVerificationComplete: false,
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
        preservationVerificationComplete: false,
        packageVerificationComplete: false,
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
        preservationVerificationComplete: false,
        packageVerificationComplete: false,
        ...(authorizingRuntimeExperimentContracts.length === 0
          ? {}
          : { authorizingRuntimeExperimentContracts }),
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
        preservationVerificationComplete: false,
        packageVerificationComplete: false,
        ...(authorizingRuntimeExperimentContracts.length === 0
          ? {}
          : { authorizingRuntimeExperimentContracts }),
        pendingNodeIds: [],
        pendingPaths: [],
        reasons: [
          "Static repair validation is complete.",
          "Runtime and package verification remain separate proof layers.",
        ],
      };
  }
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return (
    a.length === b.length &&
    a.every((value, index) => value === b[index])
  );
}

export function markRepairTransitiveRevalidated(
  state: RepairLifecycleState,
  receipt: TransitiveRevalidationReceipt,
): RepairLifecycleState {
  if (state.stage !== "transitive-revalidation-pending") {
    throw new Error(
      "Transitive revalidation receipt requires transitive-revalidation-pending state.",
    );
  }
  if (receipt.transactionId !== state.transactionId) {
    throw new Error(
      "Transitive revalidation receipt belongs to another transaction.",
    );
  }
  if (!receipt.passed) {
    throw new Error(
      "Failed transitive revalidation cannot advance repair lifecycle.",
    );
  }
  if (receipt.evidenceIds.length === 0) {
    throw new Error(
      "Transitive revalidation receipt requires explicit evidence ids.",
    );
  }
  if (
    !sameStringSet(
      receipt.validatedNodeIds,
      state.pendingNodeIds,
    ) ||
    !sameStringSet(
      receipt.validatedPaths,
      state.pendingPaths,
    )
  ) {
    throw new Error(
      "Transitive revalidation receipt does not exactly cover the pending node/path envelope.",
    );
  }

  return {
    ...state,
    stage: "static-validated",
    transitiveRevalidationComplete: true,
    pendingNodeIds: [],
    pendingPaths: [],
    reasons: [
      ...state.reasons,
      "Transitive revalidation completed with evidence: " +
        [...new Set(receipt.evidenceIds)].sort().join(", "),
    ],
  };
}

function validateReceipt(
  state: RepairLifecycleState,
  receipt: RepairVerificationReceipt,
  kind: RepairVerificationReceipt["kind"],
): void {
  if (receipt.transactionId !== state.transactionId) {
    throw new Error(
      "Repair verification receipt belongs to another transaction.",
    );
  }
  if (receipt.kind !== kind) {
    throw new Error(
      "Repair verification receipt kind mismatch.",
    );
  }
  if (!receipt.passed) {
    throw new Error(
      "Failed verification receipt cannot advance repair lifecycle.",
    );
  }
  if (receipt.evidenceIds.length === 0) {
    throw new Error(
      "Repair verification receipt requires explicit evidence ids.",
    );
  }
}

export function markRepairRuntimeVerified(
  state: RepairLifecycleState,
  receipt: RepairVerificationReceipt,
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
  validateReceipt(state, receipt, "runtime");

  const expectedContracts =
    state.authorizingRuntimeExperimentContracts ?? [];
  if (expectedContracts.length > 1) {
    throw new Error(
      "Runtime verification requires separate coverage for each authorizing experiment contract.",
    );
  }
  if (expectedContracts.length === 1) {
    const expected = expectedContracts[0]!;
    if (
      !runtimeVerificationExperimentContractCompatible(
        expected,
        receipt.runtimeExperimentContract,
      )
    ) {
      throw new Error(
        "Runtime verification receipt experiment contract is not compatible with the repair-authorizing experiment contract.",
      );
    }
  }

  return {
    ...state,
    runtimeVerificationComplete: true,
    ...(receipt.runtimeExperimentContract === undefined
      ? {}
      : {
          runtimeVerificationContract:
            receipt.runtimeExperimentContract,
        }),
    reasons: [
      ...state.reasons,
      "Runtime verification evidence has been accepted: " +
        [...new Set(receipt.evidenceIds)].sort().join(", "),
    ],
  };
}

export function markRepairPreservationVerified(
  state: RepairLifecycleState,
  receipt: PreservationVerificationReceipt,
): RepairLifecycleState {
  if (
    state.stage !== "static-validated" ||
    !state.localStaticValidationPassed ||
    !state.transitiveRevalidationComplete
  ) {
    throw new Error(
      "Preservation verification cannot be credited before static and transitive repair validation complete.",
    );
  }
  if (receipt.transactionId !== state.transactionId) {
    throw new Error(
      "Preservation verification receipt belongs to another transaction.",
    );
  }
  if (!receipt.passed) {
    throw new Error(
      "Failed preservation verification cannot advance repair lifecycle.",
    );
  }
  if (
    receipt.verifiedMustChangeInvariantIds.length === 0 ||
    receipt.verifiedMustPreserveInvariantIds.length === 0
  ) {
    throw new Error(
      "Preservation verification receipt must prove both must-change and must-preserve invariants.",
    );
  }
  if (receipt.evidenceIds.length === 0) {
    throw new Error(
      "Preservation verification receipt requires explicit evidence ids.",
    );
  }

  return {
    ...state,
    preservationVerificationComplete: true,
    reasons: [
      ...state.reasons,
      "Preservation verification evidence has been accepted: " +
        [...new Set(receipt.evidenceIds)].sort().join(", "),
    ],
  };
}

export function markRepairPackageVerified(
  state: RepairLifecycleState,
  receipt: RepairVerificationReceipt,
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
  validateReceipt(state, receipt, "package");

  return {
    ...state,
    packageVerificationComplete: true,
    reasons: [
      ...state.reasons,
      "Package verification evidence has been accepted: " +
        [...new Set(receipt.evidenceIds)].sort().join(", "),
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
    state.preservationVerificationComplete &&
    state.packageVerificationComplete
  );
}
