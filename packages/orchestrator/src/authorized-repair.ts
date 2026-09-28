import type { SemanticGraph } from "../../graph/src/index.js";
import type { DecisionBasisRevision } from "../../project-model/src/index.js";
import {
  CONTRACT_REGISTRY_REVISION,
} from "../../project-model/src/index.js";
import type {
  ApplyTransactionContext,
  ApplyTransactionResult,
  RollbackAppliedFilesResult,
} from "../../repair/src/index.js";
import {
  applyPatchTransaction,
  rollbackAppliedFiles,
} from "../../repair/src/index.js";
import type { PatchTransaction } from "../../repair/src/index.js";
import type { MutationWorkspace } from "../../repair/src/index.js";
import type { TransactionValidationResult } from "../../validation/src/index.js";
import {
  proveStaticGraphPreservation,
  type StaticGraphPreservationProof,
} from "./static-graph-preservation-proof.js";
import type { InspectTargetProfile } from "./types.js";
import type { RepairProofBundle } from "./repair-proof-bundle.js";
import { validateRepairProofBundle } from "./repair-proof-bundle.js";
import { validatePatchTransaction } from "./repair-validation.js";
import { semanticGraphFingerprint } from "./semantic-graph-fingerprint.js";

export interface AuthorizedRepairOptions {
  allowGuarded?: boolean;
  decisionBasis?: Omit<
    DecisionBasisRevision,
    "sourceFingerprint" | "graphFingerprint"
  >;
}

export interface RepairAuthorizationBasis
  extends Omit<
    DecisionBasisRevision,
    "sourceFingerprint" | "graphFingerprint"
  > {
  currentSourceFingerprint: string;
  currentGraphFingerprint: string;
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
      status: "static-preservation-failed";
      proof: RepairProofBundle;
      apply: ApplyTransactionResult;
      validation: TransactionValidationResult;
      staticPreservation: StaticGraphPreservationProof;
      rollback: RollbackAppliedFilesResult;
    }
  | {
      status: "static-preservation-failed-rollback-failed";
      proof: RepairProofBundle;
      apply: ApplyTransactionResult;
      validation: TransactionValidationResult;
      staticPreservation: StaticGraphPreservationProof;
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
  basis: RepairAuthorizationBasis,
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

  if (
    proof.decisionBasis.contractRegistryRevision !==
      CONTRACT_REGISTRY_REVISION
  ) {
    return {
      authorized: false,
      reasons: [
        "Repair proof contract registry revision is stale.",
      ],
    };
  }

  if (
    proof.sourceFingerprint !== basis.currentSourceFingerprint ||
    transaction.sourceFingerprint !== basis.currentSourceFingerprint
  ) {
    return {
      authorized: false,
      reasons: [
        "Repair proof or transaction source fingerprint is stale.",
      ],
    };
  }

  if (proof.graphFingerprint !== basis.currentGraphFingerprint) {
    return {
      authorized: false,
      reasons: [
        "Repair proof semantic graph fingerprint is stale.",
      ],
    };
  }

  for (const key of [
    "semanticIrRevision",
    "preservationContractRevision",
    "preservationBaselineRevision",
    "knowledgeRevision",
    "invariantRegistryRevision",
    "repairProviderRegistryRevision",
    "repairStrategySourceRegistryRevision",
    "repairRealizerRegistryRevision",
    "postTransformProofRevision",
    "targetProfileFingerprint",
    "probeBindingRevision",
    "runtimeEvidenceRevision",
    "runtimeExperimentContractRevision",
  ] as const) {
    const expected = proof.decisionBasis[key];
    if (
      expected !== undefined &&
      basis[key] !== expected
    ) {
      return {
        authorized: false,
        reasons: [
          "Repair proof decision basis is stale for " +
            key +
            ": expected " +
            expected +
            ", received " +
            String(basis[key] ?? "<missing>") +
            ".",
        ],
      };
    }
  }

  if (
    transaction.requiredProofs?.includes(
      "post-transform",
    ) &&
    !proof.decisionBasis.postTransformProofRevision?.trim()
  ) {
    return {
      authorized: false,
      reasons: [
        "Patch transaction requires a proven post-transform semantic proof before mutation.",
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
  currentGraph: SemanticGraph,
  target: InspectTargetProfile = {},
  options: AuthorizedRepairOptions = {},
): Promise<AuthorizedRepairApplyResult> {
  const authorization = authorizeRepairMutation(
    transaction,
    proof,
    {
      currentSourceFingerprint: context.currentSourceFingerprint,
      currentGraphFingerprint: semanticGraphFingerprint(currentGraph),
      ...(options.decisionBasis ?? {}),
    },
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
    transaction.requiredProofs?.includes(
      "post-transform",
    )
  ) {
    const rebuiltGraph =
      "rebuiltGraph" in validation
        ? validation.rebuiltGraph
        : undefined;

    const staticPreservation =
      rebuiltGraph === undefined
        ? {
            status: "blocked" as const,
            beforeFingerprint:
              semanticGraphFingerprint(
                currentGraph,
              ),
            afterFingerprint: "<missing>",
            addedNodeIds: [],
            removedNodeIds: [],
            changedOutsideEnvelopeNodeIds: [],
            changedIdentityNodeIds: [],
            edgeTopologyChanged: false,
            reasons: [
              "Post-transform repair requires rebuilt semantic graph evidence before mutation can remain applied.",
            ],
          }
        : proveStaticGraphPreservation(
            currentGraph,
            rebuiltGraph,
            {
              allowedNodeIds:
                proof.changedNodeIds,
              allowedPaths:
                transaction.affectedPaths,
            },
          );

    if (
      staticPreservation.status !==
        "proven"
    ) {
      const rollback =
        await rollbackAppliedFiles(
          workspace,
          apply.rollback,
        );
      return {
        status: rollback.ok
          ? "static-preservation-failed"
          : "static-preservation-failed-rollback-failed",
        proof,
        apply,
        validation,
        staticPreservation,
        rollback,
      };
    }
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
