import type {
  WorkSessionAuditBinding,
  WorkSessionStage,
} from "../../project-model/src/index.js";
import type {
  SelectedMapAuditRun,
} from "../map-audit-pipeline.js";

export function workSessionAuditBinding(
  audit: SelectedMapAuditRun,
): WorkSessionAuditBinding {
  return {
    authority: "selected-map-audit",
    auditRevision: audit.auditRevision,
    currentStage: audit.currentStage,
    allowedNextAction: audit.allowedNextAction,
  };
}

/**
 * Coarse session UI/storage projection only. It never authorizes audit work.
 */
export function workSessionStageFromAudit(
  audit: SelectedMapAuditRun,
): WorkSessionStage {
  switch (audit.currentStage) {
    case "TARGET":
    case "DISCOVERY":
      return "new";
    case "UNDERSTAND":
    case "MODEL":
      return "understood";
    case "STRESS":
      return "evidence-ready";
    case "PROVE":
      return "diagnosed";
    case "REPORT":
    case "COMPLETE":
      return "deliverable";
  }
}
