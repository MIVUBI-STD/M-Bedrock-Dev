import type { DiagnosticExecutionContext } from "../../project-model/src/index.js";
import type { RuntimeEvidenceIntegrityReport } from "../../project-model/src/index.js";

export type EvidenceChannel = "telemetry" | "runtime-probe";

export type EvidenceRecoveryKind =
  | "resolve-current-state-conflicts"
  | "recapture-with-observation-points"
  | "recapture-continuous-stream"
  | "rerun-runtime-probe-bundle";

export type EvidenceRecoveryBlock =
  | "current-state-claims"
  | "temporal-claims"
  | "full-repair-authorization";

export interface EvidenceRecoveryAction {
  id: string;
  channel: EvidenceChannel;
  kind: EvidenceRecoveryKind;
  priority: "high" | "medium";
  requiredContext: DiagnosticExecutionContext;
  blocks: readonly EvidenceRecoveryBlock[];
  reason: string;
}

export interface EvidenceRecoveryPlan {
  required: boolean;
  actions: readonly EvidenceRecoveryAction[];
  blocksCurrentStateClaims: boolean;
  blocksTemporalClaims: boolean;
  blocksFullRepairAuthorization: boolean;
}

function actionId(
  channel: EvidenceChannel,
  kind: EvidenceRecoveryKind,
): string {
  return "evidence-recovery::" + channel + "::" + kind;
}

function actionsFor(
  channel: EvidenceChannel,
  integrity: RuntimeEvidenceIntegrityReport,
): EvidenceRecoveryAction[] {
  const actions: EvidenceRecoveryAction[] = [];
  const context: DiagnosticExecutionContext = "LIVE_MINECRAFT";

  if (!integrity.safeForCurrentStateClaims) {
    actions.push({
      id: actionId(channel, "resolve-current-state-conflicts"),
      channel,
      kind: "resolve-current-state-conflicts",
      priority: "high",
      requiredContext: context,
      blocks: [
        "current-state-claims",
        "temporal-claims",
        "full-repair-authorization",
      ],
      reason:
        "Runtime evidence has unresolved state conflicts; capture a fresh authoritative observation set before making repair claims.",
    });
  }

  if (integrity.unlocatedObservedRecords > 0) {
    actions.push({
      id: actionId(channel, "recapture-with-observation-points"),
      channel,
      kind: "recapture-with-observation-points",
      priority: "high",
      requiredContext: context,
      blocks: [
        "temporal-claims",
        "full-repair-authorization",
      ],
      reason:
        String(integrity.unlocatedObservedRecords) +
        " observed record(s) lack tick/sequence/timestamp evidence required for temporal reasoning.",
    });
  }

  if (!integrity.continuityComplete) {
    actions.push({
      id: actionId(
        channel,
        channel === "telemetry"
          ? "recapture-continuous-stream"
          : "rerun-runtime-probe-bundle",
      ),
      channel,
      kind:
        channel === "telemetry"
          ? "recapture-continuous-stream"
          : "rerun-runtime-probe-bundle",
      priority: "high",
      requiredContext: context,
      blocks: [
        "temporal-claims",
        "full-repair-authorization",
      ],
      reason:
        channel === "telemetry"
          ? "Telemetry continuity is incomplete; rerun the scenario with a continuous stream and sufficient buffer capacity."
          : "Runtime probe exchanges are incomplete; rerun the relevant probe bundle without dropped exchanges.",
    });
  }

  return actions;
}

export function planEvidenceRecovery(
  telemetry: RuntimeEvidenceIntegrityReport,
  runtimeProbe: RuntimeEvidenceIntegrityReport,
): EvidenceRecoveryPlan {
  const actions = [
    ...actionsFor("telemetry", telemetry),
    ...actionsFor("runtime-probe", runtimeProbe),
  ].sort((a, b) =>
    Number(b.priority === "high") - Number(a.priority === "high") ||
    a.id.localeCompare(b.id)
  );

  const blocks = new Set(
    actions.flatMap((action) => action.blocks),
  );

  return {
    required: actions.length > 0,
    actions,
    blocksCurrentStateClaims: blocks.has("current-state-claims"),
    blocksTemporalClaims: blocks.has("temporal-claims"),
    blocksFullRepairAuthorization: blocks.has("full-repair-authorization"),
  };
}
