import type { SemanticGraph } from "../../graph/src/graph.js";
import type { DiagnosticRepairDecision } from "../../project-model/src/diagnostic-decision.js";
import type { PatchTransaction } from "../../repair/src/types.js";
import {
  analyzeRepairCounterfactual,
} from "./repair-counterfactual.js";
import {
  decideRepairBlastRadius,
  type RepairBlastRadiusPolicy,
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
  RepairCounterfactualImpact,
} from "./repair-counterfactual-types.js";
import type {
  RepairAdmissionDecision,
} from "./repair-admission.js";

export interface RepairAdmissionPipelineInput {
  graph: SemanticGraph;
  transaction: PatchTransaction;
  diagnostic: DiagnosticRepairDecision;
  changedNodeIds: readonly string[];
  supportingInvariantIds?: readonly string[];
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

  const proof = createRepairProofBundle(
    input.transaction,
    input.diagnostic,
    impact,
    blastRadius,
    admission,
    input.supportingInvariantIds ?? [],
  );

  return {
    impact,
    blastRadius,
    admission,
    proof,
  };
}
