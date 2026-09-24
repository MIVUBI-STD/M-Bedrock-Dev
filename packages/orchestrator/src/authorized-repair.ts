import type {
  ApplyTransactionContext,
  ApplyTransactionResult,
  RollbackAppliedFilesResult,
} from "../../repair/src/apply.js";
import {
  applyPatchTransaction,
  rollbackAppliedFiles,
} from "../../repair/src/apply.js";
import type { PatchTransaction } from "../../repair/src/types.js";
import type { MutationWorkspace } from "../../repair/src/workspace.js";
import type { TransactionValidationResult } from "../../validation/src/types.js";
import type { InspectTargetProfile } from "./types.js";
import type { RepairProofBundle } from "./repair-proof-bundle.js";
import { validateRepairProofBundle } from "./repair-proof-bundle.js";
import { validatePatchTransaction } from "./repair-validation.js";

export interface AuthorizedRepairOptions {
  allowGuarded?: boolean;
}

export type RepairMutationAuthorization =
  | {
      authorized: true;
      mode: "eligible" | "guarded";
      reasons: readonly string[];
    }
  | {
      authorized: false;
      reasons: readonly string[];
    };

export type AuthorizedRepairApplyResult =
  | {
      status: "not-authorized";
      proof: RepairProofBundle;
      reasons: readonly string[];
    }
  | {
      status: "apply-failed";
      proof: RepairProofBundle;
      apply: ApplyTransactionResult;
    }
  | {
      status: "static-validation-failed";
      proof: RepairProofBundle;
      apply: ApplyTransactionResult;
      validation: TransactionValidationResult;
      rollback: RollbackAppliedFilesResult;
    }
  | {
      status: "static-validation-failed-rollback-failed";
      proof: RepairProofBundle;
      apply: ApplyTransactionResult;
      validation: TransactionValidationResult;
      rollback: RollbackAppliedFilesResult;
    }
  | {
      status: "transitive-revalidation-pending";
      proof: RepairProofBundle;
      apply: ApplyTransactionResult;
      validation: TransactionValidationResult;
      pendingNodeIds: readonly string[];
      pendingPaths: readonly string[];
    }
  | {
      status: "validated";
      proof: RepairProofBundle;
      apply: ApplyTransactionResult;
      validation: TransactionValidationResult;
    };

export function authorizeRepairMutation(
  transaction: PatchTransaction,
  proof: RepairProofBundle,
  options: AuthorizedRepairOptions = {},
): RepairMutationAuthorization {
  const proofErrors = validateRepairProofBundle(
    transaction,
    proof,
  );
  if (proofErrors.length > 0) {
    return {
      authorized: false,
      reasons: [
        "Repair proof bundle failed integrity validation.",
        ...proofErrors,
      ],
    };
  }

  if (proof.transactionId !== transaction.id) {
    return {
      authorized: false,
      reasons: [
        "Repair proof bundle does not belong to this patch transaction.",
      ],
    };
  }

  if (
    proof.admissionDisposition === "blocked" ||
    proof.admissionDisposition === "review-required"
  ) {
    return {
      authorized: false,
      reasons: [
        "Repair admission does not authorize unattended mutation: " +
          proof.admissionDisposition +
          ".",
      ],
    };
  }

  if (
    proof.admissionDisposition === "guarded" &&
    options.allowGuarded !== true
  ) {
    return {
      authorized: false,
      reasons: [
        "Guarded repair requires an explicit allowGuarded authorization.",
      ],
    };
  }

  if (transaction.validation.length === 0) {
    return {
      authorized: false,
      reasons: [
        "Authorized repair requires at least one concrete post-mutation validation step.",
      ],
    };
  }

  return {
    authorized: true,
    mode:
      proof.admissionDisposition === "guarded"
        ? "guarded"
        : "eligible",
    reasons: [
      "Proof bundle matches the transaction.",
      "Repair admission authorizes mutation.",
      "Concrete post-mutation validation is declared.",
    ],
  };
}

export async function applyAuthorizedRepair(
  transaction: PatchTransaction,
  workspace: MutationWorkspace,
  context: ApplyTransactionContext,
  proof: RepairProofBundle,
  target: InspectTargetProfile = {},
  options: AuthorizedRepairOptions = {},
): Promise<AuthorizedRepairApplyResult> {
  const authorization = authorizeRepairMutation(
    transaction,
    proof,
    options,
  );

  if (!authorization.authorized) {
    return {
      status: "not-authorized",
      proof,
      reasons: authorization.reasons,
    };
  }

  const apply = await applyPatchTransaction(
    transaction,
    workspace,
    context,
  );

  if (!apply.ok) {
    return {
      status: "apply-failed",
      proof,
      apply,
    };
  }

  const validation = await validatePatchTransaction(
    transaction,
    workspace,
    target,
  );

  if (!validation.ok) {
    const rollback = await rollbackAppliedFiles(
      workspace,
      apply.rollback,
    );
    return {
      status: rollback.ok
        ? "static-validation-failed"
        : "static-validation-failed-rollback-failed",
      proof,
      apply,
      validation,
      rollback,
    };
  }

  if (
    proof.requiredRevalidationNodeIds.length > 0 ||
    proof.requiredRevalidationPaths.length > 0
  ) {
    return {
      status: "transitive-revalidation-pending",
      proof,
      apply,
      validation,
      pendingNodeIds: proof.requiredRevalidationNodeIds,
      pendingPaths: proof.requiredRevalidationPaths,
    };
  }

  return {
    status: "validated",
    proof,
    apply,
    validation,
  };
}
