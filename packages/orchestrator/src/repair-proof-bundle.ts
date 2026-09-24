import type { DiagnosticRepairDecision } from "../../project-model/src/diagnostic-decision.js";
import type { PatchTransaction } from "../../repair/src/types.js";
import type {
  RepairBlastRadiusDecision,
  RepairCounterfactualImpact,
  RepairImpactTrace,
} from "./repair-counterfactual-types.js";
import type { RepairAdmissionDecision } from "./repair-admission.js";

export interface RepairProofBundle {
  transactionId: string;
  incidentId: string;
  selectedCandidateId?: string;
  diagnosticDisposition: DiagnosticRepairDecision["disposition"];
  claimStrength: DiagnosticRepairDecision["claimStrength"];
  effectiveEvidenceLevel?: DiagnosticRepairDecision["effectiveEvidenceLevel"];
  blastRadiusDisposition: RepairBlastRadiusDecision["disposition"];
  admissionDisposition: RepairAdmissionDecision["disposition"];
  supportingInvariantIds: readonly string[];
  changedNodeIds: readonly string[];
  affectedNodeIds: readonly string[];
  requiredRevalidationNodeIds: readonly string[];
  requiredRevalidationPaths: readonly string[];
  impactTraces: readonly RepairImpactTrace[];
  reasons: readonly string[];
}

export function createRepairProofBundle(
  transaction: PatchTransaction,
  diagnostic: DiagnosticRepairDecision,
  impact: RepairCounterfactualImpact,
  blastRadius: RepairBlastRadiusDecision,
  admission: RepairAdmissionDecision,
  supportingInvariantIds: readonly string[] = [],
): RepairProofBundle {
  for (const [label, id] of [
    ["counterfactual impact", impact.transactionId],
    ["blast-radius decision", blastRadius.transactionId],
    ["admission decision", admission.transactionId],
  ] as const) {
    if (id !== transaction.id) {
      throw new Error(
        "Repair proof bundle " +
          label +
          " does not belong to transaction " +
          transaction.id +
          ".",
      );
    }
  }

  const changed = new Set(impact.changedNodeIds);
  const revalidationNodeIds = impact.affectedNodeIds
    .filter((id) => !changed.has(id))
    .sort();

  const changedPaths = new Set(transaction.affectedPaths);
  const revalidationPaths = impact.affectedPaths
    .filter((path) => !changedPaths.has(path))
    .sort();

  return {
    transactionId: transaction.id,
    incidentId: diagnostic.incidentId,
    ...(diagnostic.selectedCandidateId === undefined
      ? {}
      : { selectedCandidateId: diagnostic.selectedCandidateId }),
    diagnosticDisposition: diagnostic.disposition,
    claimStrength: diagnostic.claimStrength,
    ...(diagnostic.effectiveEvidenceLevel === undefined
      ? {}
      : { effectiveEvidenceLevel: diagnostic.effectiveEvidenceLevel }),
    blastRadiusDisposition: blastRadius.disposition,
    admissionDisposition: admission.disposition,
    supportingInvariantIds: [...new Set(supportingInvariantIds)].sort(),
    changedNodeIds: [...impact.changedNodeIds],
    affectedNodeIds: [...impact.affectedNodeIds],
    requiredRevalidationNodeIds: revalidationNodeIds,
    requiredRevalidationPaths: revalidationPaths,
    impactTraces: impact.impactTraces,
    reasons: [
      ...diagnostic.reasons,
      ...blastRadius.reasons,
      ...admission.reasons,
    ],
  };
}
