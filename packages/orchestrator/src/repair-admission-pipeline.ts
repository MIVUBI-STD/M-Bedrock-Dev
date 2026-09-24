import type { SemanticGraph } from "../../graph/src/index.js";
import type { DiagnosticRepairDecision } from "../../project-model/src/diagnostic-decision.js";
import {
  CONTRACT_REGISTRY_REVISION,
} from "../../project-model/src/contract-registry-revision.js";
import type { DecisionBasisRevision } from "../../project-model/src/decision-ledger.js";
import type { PatchTransaction } from "../../repair/src/index.js";
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

  const admission = decideRepairAdmission(
    input.transaction,
    input.diagnostic,
    blastRadius,
  );

  const decisionBasis: DecisionBasisRevision = {
    ...(input.decisionBasis ?? {}),
    contractRegistryRevision: CONTRACT_REGISTRY_REVISION,
    sourceFingerprint: input.transaction.sourceFingerprint,
    graphFingerprint: semanticGraphFingerprint(input.graph),
  };

  const proof = createRepairProofBundle(
    input.transaction,
    input.diagnostic,
    impact,
    blastRadius,
    admission,
    decisionBasis,
    input.supportingInvariantIds ?? [],
  );

  return {
    impact,
    blastRadius,
    admission,
    proof,
  };
}
