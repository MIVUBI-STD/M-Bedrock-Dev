import type { SemanticGraph } from "../../graph/src/index.js";
import type { DiagnosticRepairDecision } from "../../project-model/src/index.js";
import {
  CONTRACT_REGISTRY_REVISION,
  runtimeVerificationExperimentContractsFromProvenance,
  runtimeVerificationExperimentEnvelopeRevision,
} from "../../project-model/src/index.js";
import type { DecisionBasisRevision } from "../../project-model/src/index.js";
import type { PatchTransaction } from "../../repair/src/index.js";
import type { PreservationReadinessResult } from "../../preservation/src/index.js";
import {
  analyzeRepairCounterfactual,
} from "./repair-counterfactual.js";
import {
  decideRepairBlastRadius,
} from "./repair-blast-radius.js";
import {
  decideRepairAdmission,
} from "./repair-admission.js";
import {
  createRepairProofBundle,
  type RepairProofBundle,
} from "./repair-proof-bundle.js";
import type {
  RepairBlastRadiusDecision,
  RepairBlastRadiusPolicy,
  RepairCounterfactualImpact,
} from "./repair-counterfactual-types.js";
import type {
  RepairAdmissionDecision,
} from "./repair-admission.js";
import { semanticGraphFingerprint } from "./semantic-graph-fingerprint.js";

export interface RepairAdmissionPipelineInput {
  graph: SemanticGraph;
  transaction: PatchTransaction;
  diagnostic: DiagnosticRepairDecision;
  changedNodeIds: readonly string[];
  supportingInvariantIds?: readonly string[];
  decisionBasis?: Omit<
    DecisionBasisRevision,
    "sourceFingerprint" | "graphFingerprint"
  >;
  blastRadiusPolicy?: RepairBlastRadiusPolicy;
  preservationReadiness?: PreservationReadinessResult;
}

export interface RepairAdmissionPipelineResult {
  impact: RepairCounterfactualImpact;
  blastRadius: RepairBlastRadiusDecision;
  admission: RepairAdmissionDecision;
  proof: RepairProofBundle;
}

export function evaluateRepairAdmissionPipeline(
  input: RepairAdmissionPipelineInput,
): RepairAdmissionPipelineResult {
  if (
    input.diagnostic.claimStrength === "proven-runtime" &&
    !input.decisionBasis?.runtimeEvidenceRevision?.trim()
  ) {
    throw new Error(
      "Runtime-proven repair admission requires a decision basis with runtimeEvidenceRevision from the analyzed evidence snapshot.",
    );
  }

  const impact = analyzeRepairCounterfactual(
    input.graph,
    {
      transaction: input.transaction,
      changedNodeIds: input.changedNodeIds,
    },
  );

  const blastRadius = decideRepairBlastRadius(
    impact,
    input.blastRadiusPolicy,
  );

  const rawAdmission = decideRepairAdmission(
    input.transaction,
    input.diagnostic,
    blastRadius,
  );

  const admission: RepairAdmissionDecision =
    (
      rawAdmission.disposition === "eligible" ||
      rawAdmission.disposition === "guarded"
    ) &&
    (
      input.preservationReadiness === undefined ||
      input.preservationReadiness.disposition !== "ready" ||
      input.preservationReadiness.baselineEvidenceIds.length === 0
    )
      ? {
          transactionId: input.transaction.id,
          disposition: "blocked",
          reasons: [
            "Mutation-authorizing repair admission requires preservation readiness and explicit baseline evidence before mutation can be considered safe.",
            ...(input.preservationReadiness?.reasons ?? []),
          ],
        }
      : rawAdmission;

  const runtimeExperimentContracts =
    runtimeVerificationExperimentContractsFromProvenance(
      input.diagnostic.causalProof?.interventionProvenance ?? [],
    );

  const decisionBasis: DecisionBasisRevision = {
    ...(input.decisionBasis ?? {}),
    contractRegistryRevision: CONTRACT_REGISTRY_REVISION,
    sourceFingerprint: input.transaction.sourceFingerprint,
    graphFingerprint: semanticGraphFingerprint(input.graph),
    ...(runtimeExperimentContracts.length === 0
      ? {}
      : {
          runtimeExperimentContractRevision:
            runtimeVerificationExperimentEnvelopeRevision(
              runtimeExperimentContracts,
            ),
        }),
  };

  const proof = createRepairProofBundle(
    input.transaction,
    input.diagnostic,
    impact,
    blastRadius,
    admission,
    decisionBasis,
    input.supportingInvariantIds ?? [],
    input.preservationReadiness,
  );

  return {
    impact,
    blastRadius,
    admission,
    proof,
  };
}
