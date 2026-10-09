import type {
  RuntimeEvidenceIntegrityReport,
} from "../../../project-model/src/index.js";
import {
  evaluateRepairAdmissionPipeline,
  type RepairAdmissionPipelineInput,
  type RepairAdmissionPipelineResult,
} from "../repair/repair-admission-pipeline.js";
import {
  decideReclassifiedRepairEntry,
  type ReclassifiedRepairEntryDecision,
} from "./runtime-reclassification-repair-gate.js";
import type {
  RuntimeIntentDiagnosticReclassification,
} from "../diagnosis/runtime-intent-diagnostic-reclassification.js";

export interface RuntimeClassifiedRepairPipelineInput
  extends RepairAdmissionPipelineInput {
  reclassification:
    RuntimeIntentDiagnosticReclassification;
  runtimeIntegrity?:
    RuntimeEvidenceIntegrityReport;
}

export interface RuntimeClassifiedRepairPipelineResult {
  entry: ReclassifiedRepairEntryDecision;
  pipeline?: RepairAdmissionPipelineResult;
}

export function evaluateRuntimeClassifiedRepairPipeline(
  input: RuntimeClassifiedRepairPipelineInput,
): RuntimeClassifiedRepairPipelineResult {
  const entry = decideReclassifiedRepairEntry(
    input.reclassification,
    input.diagnostic,
    input.runtimeIntegrity,
    input.repairAuthority === undefined
      ? undefined
      : {
          approvedBug:
            input.repairAuthority.kind === "approved-bug",
          preservationContractReady: true,
        },
  );

  if (
    entry.disposition !== "admit" &&
    entry.disposition !== "guarded-admit"
  ) {
    return { entry };
  }

  const pipeline = evaluateRepairAdmissionPipeline({
    graph: input.graph,
    transaction: input.transaction,
    diagnostic: input.diagnostic,
    changedNodeIds: input.changedNodeIds,
    ...(input.supportingInvariantIds === undefined
      ? {}
      : {
          supportingInvariantIds:
            input.supportingInvariantIds,
        }),
    ...(input.decisionBasis === undefined
      ? {}
      : {
          decisionBasis: input.decisionBasis,
        }),
    ...(input.blastRadiusPolicy === undefined
      ? {}
      : {
          blastRadiusPolicy:
            input.blastRadiusPolicy,
        }),
    ...(input.preservationReadiness === undefined
      ? {}
      : {
          preservationReadiness:
            input.preservationReadiness,
        }),
    ...(input.repairAuthority === undefined
      ? {}
      : {
          repairAuthority: input.repairAuthority,
        }),
    ...(input.postTransformProofBinding === undefined
      ? {}
      : {
          postTransformProofBinding:
            input.postTransformProofBinding,
        }),
  });

  if (
    entry.disposition === "guarded-admit" &&
    pipeline.admission.disposition === "eligible"
  ) {
    throw new Error(
      "Guarded reclassification entry must not escalate to full repair eligibility.",
    );
  }

  return {
    entry,
    pipeline,
  };
}
