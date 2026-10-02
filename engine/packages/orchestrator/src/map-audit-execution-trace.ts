import type {
  SelectedMapAuditAdmission,
  SelectedMapAuditStage,
} from "./map-audit-admission.js";
import type {
  MandatoryAuditProcedureReceipt,
} from "./inspection/mandatory-audit-procedure.js";

export type AuditExecutionStageStatus =
  | "AUTHORIZED_COMPLETE"
  | "AUTHORIZED_BLOCKED"
  | "EVIDENCE_COLLECTED_NOT_AUTHORIZED"
  | "NOT_REACHED";

export interface AuditExecutionStageReceipt {
  readonly stage: SelectedMapAuditStage;
  readonly status: AuditExecutionStageStatus;
  readonly checkpointIds: readonly string[];
  readonly blockingCheckpointIds: readonly string[];
  readonly reason: string;
}

export interface AuditExecutionTrace {
  readonly policy: "evidence-collection-vs-decision-authorization";
  readonly evidenceCollectionComplete: boolean;
  readonly firstBlockingStage?: SelectedMapAuditStage;
  readonly stages: readonly AuditExecutionStageReceipt[];
}

const ORDER: readonly SelectedMapAuditStage[] = [
  "TARGET",
  "DISCOVERY",
  "UNDERSTAND",
  "MODEL",
  "STRESS",
  "PROVE",
  "REPORT",
];

function checkpointStage(id: string): SelectedMapAuditStage {
  if (id === "A1") return "TARGET";
  if (id === "A2") return "DISCOVERY";
  if (id.startsWith("A")) return "UNDERSTAND";
  if (id.startsWith("B")) return "MODEL";
  if (id.startsWith("C")) return "STRESS";
  if (id.startsWith("D")) return "PROVE";
  return "REPORT";
}

export function deriveAuditExecutionTrace(input: {
  readonly admission: SelectedMapAuditAdmission;
  readonly procedure: MandatoryAuditProcedureReceipt;
}): AuditExecutionTrace {
  const first = input.admission.firstBlockingStage;
  const discoveryCheckpoint =
    input.procedure.checkpoints.find(
      (item) => item.id === "A2",
    );
  const evidenceCollectionComplete =
    discoveryCheckpoint?.status === "CLOSED";
  const firstIndex =
    first === undefined ? Number.POSITIVE_INFINITY : ORDER.indexOf(first);

  const stages = ORDER.map((stage, index) => {
    const checkpointIds = input.procedure.checkpoints
      .filter((item) => checkpointStage(item.id) === stage)
      .map((item) => item.id)
      .sort();
    const blockingCheckpointIds =
      input.procedure.blockingCheckpointIds
        .filter((id) => checkpointStage(id) === stage)
        .sort();

    if (first === undefined) {
      return {
        stage,
        status: "AUTHORIZED_COMPLETE" as const,
        checkpointIds,
        blockingCheckpointIds,
        reason:
          "All prior ordered audit gates are closed; this stage is authorized complete.",
      };
    }

    if (index < firstIndex) {
      return {
        stage,
        status: "AUTHORIZED_COMPLETE" as const,
        checkpointIds,
        blockingCheckpointIds,
        reason:
          "This stage completed before the first blocking stage.",
      };
    }

    if (index === firstIndex) {
      return {
        stage,
        status: "AUTHORIZED_BLOCKED" as const,
        checkpointIds,
        blockingCheckpointIds,
        reason:
          "This is the first blocking decision stage. Later evidence may exist but cannot authorize later-stage conclusions.",
      };
    }

    return {
      stage,
      status: "EVIDENCE_COLLECTED_NOT_AUTHORIZED" as const,
      checkpointIds,
      blockingCheckpointIds,
      reason:
        "Inspection may have pre-collected evidence for efficiency, but ordered decision authority has not reached this stage.",
    };
  });

  return {
    policy: "evidence-collection-vs-decision-authorization",
    evidenceCollectionComplete,
    ...(first === undefined ? {} : { firstBlockingStage: first }),
    stages,
  };
}
