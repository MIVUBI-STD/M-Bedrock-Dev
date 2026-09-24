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
  sourceFingerprint: string;
  graphFingerprint: string;
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
  graphFingerprint: string,
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

  if (!graphFingerprint.trim()) {
    throw new Error("Repair proof bundle requires a semantic graph fingerprint.");
  }

  return {
    transactionId: transaction.id,
    sourceFingerprint: transaction.sourceFingerprint,
    graphFingerprint,
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


function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

export function validateRepairProofBundle(
  transaction: PatchTransaction,
  proof: RepairProofBundle,
): string[] {
  const errors: string[] = [];

  if (proof.transactionId !== transaction.id) {
    errors.push(
      "Repair proof bundle does not belong to this patch transaction.",
    );
  }

  if (proof.sourceFingerprint !== transaction.sourceFingerprint) {
    errors.push(
      "Repair proof source fingerprint does not match the patch transaction.",
    );
  }

  if (!proof.graphFingerprint.trim()) {
    errors.push(
      "Repair proof semantic graph fingerprint must be non-empty.",
    );
  }

  for (const [label, values] of [
    ["supportingInvariantIds", proof.supportingInvariantIds],
    ["changedNodeIds", proof.changedNodeIds],
    ["affectedNodeIds", proof.affectedNodeIds],
    ["requiredRevalidationNodeIds", proof.requiredRevalidationNodeIds],
    ["requiredRevalidationPaths", proof.requiredRevalidationPaths],
  ] as const) {
    const duplicates = duplicateValues(values);
    if (duplicates.length > 0) {
      errors.push(
        label + " contains duplicate values: " + duplicates.join(", "),
      );
    }
  }

  const changed = new Set(proof.changedNodeIds);
  const affected = new Set(proof.affectedNodeIds);

  for (const id of changed) {
    if (!affected.has(id)) {
      errors.push(
        "Changed node is missing from affectedNodeIds: " + id,
      );
    }
  }

  for (const id of proof.requiredRevalidationNodeIds) {
    if (!affected.has(id)) {
      errors.push(
        "Revalidation node is outside affectedNodeIds: " + id,
      );
    }
    if (changed.has(id)) {
      errors.push(
        "Changed node must not also be listed as a transitive revalidation node: " +
          id,
      );
    }
  }

  const transactionPaths = new Set(transaction.affectedPaths);
  for (const path of proof.requiredRevalidationPaths) {
    if (transactionPaths.has(path)) {
      errors.push(
        "Directly mutated path must not also be listed as transitive revalidation: " +
          path,
      );
    }
  }

  for (const trace of proof.impactTraces) {
    if (!changed.has(trace.changedNodeId)) {
      errors.push(
        "Impact trace references undeclared changed node: " +
          trace.changedNodeId,
      );
    }
    if (!affected.has(trace.affectedNodeId)) {
      errors.push(
        "Impact trace references node outside affectedNodeIds: " +
          trace.affectedNodeId,
      );
    }
    if (trace.depth !== trace.edgePath.length) {
      errors.push(
        "Impact trace depth does not match edgePath length.",
      );
    }
    if (
      trace.nodePath[0] !== trace.changedNodeId ||
      trace.nodePath.at(-1) !== trace.affectedNodeId
    ) {
      errors.push(
        "Impact trace nodePath endpoints do not match declared nodes.",
      );
    }
  }

  if (
    proof.admissionDisposition === "eligible" &&
    proof.diagnosticDisposition !== "repair-eligible"
  ) {
    errors.push(
      "Eligible admission requires repair-eligible diagnostic authorization.",
    );
  }

  if (
    proof.admissionDisposition === "guarded" &&
    proof.diagnosticDisposition !== "guarded-repair-eligible"
  ) {
    errors.push(
      "Guarded admission requires guarded-repair-eligible diagnostic authorization.",
    );
  }

  if (
    (proof.admissionDisposition === "eligible" ||
      proof.admissionDisposition === "guarded") &&
    proof.blastRadiusDisposition !== "minimal" &&
    proof.blastRadiusDisposition !== "bounded"
  ) {
    errors.push(
      "Mutation-authorizing admission requires minimal or bounded blast radius.",
    );
  }

  if (
    proof.claimStrength === "proven-runtime" &&
    proof.effectiveEvidenceLevel !== "proven-with-observed-outcome"
  ) {
    errors.push(
      "proven-runtime claim requires proven-with-observed-outcome evidence.",
    );
  }

  if (
    proof.claimStrength === "proven-static" &&
    proof.effectiveEvidenceLevel !== "proven-dependency-violation"
  ) {
    errors.push(
      "proven-static claim requires proven-dependency-violation evidence.",
    );
  }

  if (
    (proof.admissionDisposition === "eligible" ||
      proof.admissionDisposition === "guarded") &&
    !proof.selectedCandidateId
  ) {
    errors.push(
      "Mutation-authorizing proof requires a selected root-cause candidate.",
    );
  }

  return errors;
}
