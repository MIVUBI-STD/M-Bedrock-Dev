import type {
  ProjectWorkspaceLayout,
  WorkSessionAuditBinding,
  WorkSessionCheckpoint,
  WorkSessionStage,
} from "../../../project-model/src/index.js";
import {
  saveWorkSessionCheckpoint,
} from "./work-session-store.js";
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


function auditEvidenceIds(
  audit: SelectedMapAuditRun,
): readonly string[] {
  return [
    ...new Set(
      audit.inspection.mandatoryAuditProcedure.checkpoints.flatMap(
        (checkpoint) => [
          ...checkpoint.evidenceIds,
          ...checkpoint.obligations.flatMap(
            (obligation) => obligation.evidenceIds,
          ),
        ],
      ),
    ),
  ].sort();
}

/**
 * Canonical persistence projection for a selected-map audit.
 * The generic work-session stage is a mirror only; audit authority stays in
 * SelectedMapAuditRun/map-audit-admission.
 */
export function projectSelectedMapAuditWorkSession(input: {
  readonly audit: SelectedMapAuditRun;
  readonly sessionId: string;
  readonly goal: string;
  readonly previous?: WorkSessionCheckpoint;
}): WorkSessionCheckpoint {
  const { audit, previous } = input;

  if (!input.sessionId.trim() || !input.goal.trim()) {
    throw new Error(
      "Audit work-session mirror requires non-empty sessionId and goal.",
    );
  }

  if (
    previous !== undefined &&
    (
      previous.sessionId !== input.sessionId ||
      previous.artifact.artifactId !==
        audit.identity.artifactId ||
      previous.artifact.artifactFingerprint !==
        audit.identity.artifactFingerprint
    )
  ) {
    throw new Error(
      "Refusing to mirror SelectedMapAuditRun into a work session bound to another session/artifact.",
    );
  }

  const scenario =
    audit.inspection.hiddenGameplayDefects.scenarioAudit;

  return {
    schemaVersion: 1,
    sessionId: input.sessionId,
    goal: input.goal,
    artifact: {
      artifactId: audit.identity.artifactId,
      artifactFingerprint:
        audit.identity.artifactFingerprint,
      ...(audit.identity.levelName === undefined
        ? {}
        : { label: audit.identity.levelName }),
      ...(audit.identity.releaseVersion === undefined
        ? {}
        : { version: audit.identity.releaseVersion }),
    },
    stage: workSessionStageFromAudit(audit),
    audit: workSessionAuditBinding(audit),
    revision:
      previous === undefined
        ? 1
        : previous.revision + 1,
    references: {
      completedCapabilityIds: [
        ...audit.inspection.gameplayWorld
          .analysisExecution.executedCapabilityIds,
      ].sort(),
      evidenceIds: [...auditEvidenceIds(audit)],
      semanticNodeIds:
        audit.inspection.gameplayIntent.model.nodes
          .map((node) => node.id)
          .sort(),
      proofClaimIds: [
        "audit-revision:" + audit.auditRevision,
        ...[
          ...audit.issueLanes.BUG,
          ...audit.issueLanes.DESIGN_MISMATCH,
        ]
          .filter((finding) =>
            finding.status === "PROVEN"
          )
          .map((finding) =>
            finding.causalLinkId
          ),
      ].sort(),
      validationScenarioIds:
        scenario.graph.scenarios
          .map((item) => item.id)
          .sort(),
    },
    nextActions: [audit.allowedNextAction],
    blockers:
      audit.status === "BLOCKED"
        ? [...audit.reasons].sort()
        : [],
  };
}

export async function saveSelectedMapAuditWorkSessionMirror(
  workspace: ProjectWorkspaceLayout,
  input: {
    readonly audit: SelectedMapAuditRun;
    readonly sessionId: string;
    readonly goal: string;
    readonly previous?: WorkSessionCheckpoint;
  },
): Promise<WorkSessionCheckpoint> {
  const checkpoint =
    projectSelectedMapAuditWorkSession(input);
  await saveWorkSessionCheckpoint(
    workspace,
    checkpoint,
  );
  return checkpoint;
}
