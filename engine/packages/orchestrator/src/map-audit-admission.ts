import type {
  GameplayModelClosureResult,
} from "../../gameplay-intent/src/index.js";
import type {
  GameplayDiscoveryClosure,
} from "./inspection/gameplay-discovery-closure.js";
import type {
  GameplayScenarioClosure,
} from "./inspection/gameplay-scenario-model.js";
import type {
  GameplayDefectResolutionGate,
} from "./inspection/gameplay-defect-resolution.js";
import type {
  MandatoryAuditProcedureReceipt,
} from "./inspection/mandatory-audit-procedure.js";

export type SelectedMapAuditStage =
  | "TARGET"
  | "DISCOVERY"
  | "UNDERSTAND"
  | "MODEL"
  | "STRESS"
  | "PROVE"
  | "REPORT";

export interface SelectedMapAuditAdmissionInput {
  readonly mandatoryAuditProcedure:
    MandatoryAuditProcedureReceipt | undefined;
  readonly gameplayDiscoveryClosure:
    GameplayDiscoveryClosure;
  readonly gameplayClosure:
    GameplayModelClosureResult;
  readonly gameplayScenarioClosure?:
    GameplayScenarioClosure;
  readonly gameplayDefectResolution?:
    GameplayDefectResolutionGate;
}

export interface SelectedMapAuditAdmissionIssue {
  readonly stage: SelectedMapAuditStage;
  readonly code:
    | "MISSING_PROCEDURE"
    | "PROCEDURE_BLOCKED"
    | "DISCOVERY_OPEN"
    | "DISCOVERY_PARTIAL"
    | "GAMEPLAY_MODEL_OPEN"
    | "GAMEPLAY_MODEL_PARTIAL"
    | "SCENARIO_MISSING"
    | "SCENARIO_OPEN"
    | "DEFECT_RESOLUTION_MISSING"
    | "DEFECT_RESOLUTION_BLOCKED";
  readonly message: string;
}

export interface SelectedMapAuditAdmission {
  readonly policy: "selected-map-audit-ordered-admission";
  readonly status: "READY" | "BLOCKED";
  readonly firstBlockingStage?: SelectedMapAuditStage;
  readonly issues: readonly SelectedMapAuditAdmissionIssue[];
}

export const SELECTED_MAP_AUDIT_STAGE_ORDER:
  readonly SelectedMapAuditStage[] = [
    "TARGET",
    "DISCOVERY",
    "UNDERSTAND",
    "MODEL",
    "STRESS",
    "PROVE",
    "REPORT",
  ];

export function selectedMapAuditStageForCheckpoint(
  checkpointId: string,
): SelectedMapAuditStage {
  if (checkpointId === "A1") return "TARGET";
  if (checkpointId === "A2") return "DISCOVERY";
  if (checkpointId.startsWith("A")) return "UNDERSTAND";
  if (checkpointId.startsWith("B")) return "MODEL";
  if (checkpointId.startsWith("C")) return "STRESS";
  if (checkpointId.startsWith("D")) return "PROVE";
  return "REPORT";
}

export function assessSelectedMapAuditAdmission(
  input: SelectedMapAuditAdmissionInput,
): SelectedMapAuditAdmission {
  const issues: SelectedMapAuditAdmissionIssue[] = [];
  const procedure = input.mandatoryAuditProcedure;

  if (procedure === undefined) {
    issues.push({
      stage: "TARGET",
      code: "MISSING_PROCEDURE",
      message:
        "Mandatory Audit Procedure receipt is missing; ordered audit admission cannot be established.",
    });
  } else {
    for (const checkpointId of procedure.blockingCheckpointIds) {
      issues.push({
        stage: selectedMapAuditStageForCheckpoint(checkpointId),
        code: "PROCEDURE_BLOCKED",
        message:
          "Mandatory Audit Procedure checkpoint " +
          checkpointId +
          " blocks continuation.",
      });
    }
  }

  if (input.gameplayDiscoveryClosure.status === "OPEN") {
    issues.push({
      stage: "DISCOVERY",
      code: "DISCOVERY_OPEN",
      message:
        "Gameplay Discovery Closure is OPEN; later audit stages cannot authorize production continuation.",
    });
  } else if (
    input.gameplayDiscoveryClosure.status === "PARTIAL"
  ) {
    issues.push({
      stage: "DISCOVERY",
      code: "DISCOVERY_PARTIAL",
      message:
        "Gameplay Discovery Closure is PARTIAL; unresolved selected-artifact references are not a runtime-only exception and must be resolved before production continuation.",
    });
  }

  if (input.gameplayClosure.status === "OPEN") {
    issues.push({
      stage: "UNDERSTAND",
      code: "GAMEPLAY_MODEL_OPEN",
      message:
        "Gameplay Model Closure is OPEN; gameplay understanding is incomplete.",
    });
  } else if (input.gameplayClosure.status === "PARTIAL") {
    issues.push({
      stage: "UNDERSTAND",
      code: "GAMEPLAY_MODEL_PARTIAL",
      message:
        "Gameplay Model Closure is PARTIAL; unknown, blocked, or unextracted material gameplay semantics must be resolved before production continuation.",
    });
  }

  if (input.gameplayScenarioClosure === undefined) {
    issues.push({
      stage: "PROVE",
      code: "SCENARIO_MISSING",
      message:
        "Gameplay Scenario Closure is missing; RIG/causal proof cannot be bypassed.",
    });
  } else if (input.gameplayScenarioClosure.status === "OPEN") {
    issues.push({
      stage: "PROVE",
      code: "SCENARIO_OPEN",
      message:
        "Gameplay Scenario Closure is OPEN; scenario/RIG proof is incomplete.",
    });
  }

  if (input.gameplayDefectResolution === undefined) {
    issues.push({
      stage: "PROVE",
      code: "DEFECT_RESOLUTION_MISSING",
      message:
        "Gameplay Defect Resolution is missing; contradiction resolution cannot be bypassed.",
    });
  } else if (input.gameplayDefectResolution.status === "BLOCKED") {
    issues.push({
      stage: "PROVE",
      code: "DEFECT_RESOLUTION_BLOCKED",
      message:
        "Gameplay Defect Resolution is BLOCKED; AI analysis work remains before review.",
    });
  }

  const firstBlockingStage = SELECTED_MAP_AUDIT_STAGE_ORDER.find((stage) =>
    issues.some((issue) => issue.stage === stage)
  );

  return {
    policy: "selected-map-audit-ordered-admission",
    status: issues.length === 0 ? "READY" : "BLOCKED",
    ...(firstBlockingStage === undefined
      ? {}
      : { firstBlockingStage }),
    issues,
  };
}
