import { createHash } from "node:crypto";
import type {
  SelectedMapAuditAdmission,
} from "./map-audit-admission.js";
import type {
  MandatoryAuditProcedureReceipt,
} from "./inspection/mandatory-audit-procedure.js";
import type {
  GameplayScenarioGraph,
} from "./inspection/gameplay-scenario-model.js";
import type {
  GameplayDefectResolutionGate,
} from "./inspection/gameplay-defect-resolution.js";
import type {
  SelectedMapAuditIdentity,
} from "./map-audit-identity.js";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonical(child)]),
    );
  }
  return value;
}

export function deriveSelectedMapAuditRevision(input: {
  readonly identity: SelectedMapAuditIdentity;
  readonly admission: SelectedMapAuditAdmission;
  readonly procedure: MandatoryAuditProcedureReceipt;
  readonly graph: GameplayScenarioGraph;
  readonly defectResolution: GameplayDefectResolutionGate;
}): string {
  const basis = {
    schemaVersion: 1,
    identity: input.identity,
    admission: {
      status: input.admission.status,
      firstBlockingStage:
        input.admission.firstBlockingStage ?? null,
      issues: input.admission.issues,
    },
    procedure: {
      status: input.procedure.status,
      blockingCheckpointIds:
        input.procedure.blockingCheckpointIds,
      checkpoints: input.procedure.checkpoints.map((item) => ({
        id: item.id,
        status: item.status,
        reasonCode: item.reasonCode,
        blocksPublication: item.blocksPublication,
        obligations: item.obligations.map((obligation) => ({
          id: obligation.id,
          required: obligation.required,
          satisfied: obligation.satisfied,
          evidenceIds: obligation.evidenceIds,
        })),
      })),
    },
    scenario: {
      scenarios: input.graph.scenarios.map((item) => ({
        id: item.id,
        componentIds: item.componentIds,
        requiredKnowledgeIds: item.requiredKnowledgeIds,
      })),
      causalLinks: input.graph.causalLinks.map((item) => ({
        id: item.id,
        status: item.status,
        evidenceIds: item.evidenceIds,
        subjectIds: item.subjectIds,
        componentIds: item.componentIds,
      })),
      knowledgeReceipts: input.graph.knowledgeReceipts.map((item) => ({
        requirementId: item.requirementId,
        status: item.status,
        evidenceIds: item.evidenceIds,
        capabilityIdsUsed: item.capabilityIdsUsed,
      })),
    },
    defectResolution: input.defectResolution.resolutions.map((item) => ({
      causalLinkId: item.causalLinkId,
      disposition: item.disposition,
      evidenceIds: item.evidenceIds ?? [],
      counterProofEvidenceIds:
        item.counterProofEvidenceIds ?? [],
      counterProofSearch: item.counterProofSearch ?? null,
    })),
  };

  return createHash("sha256")
    .update(JSON.stringify(canonical(basis)))
    .digest("hex");
}
