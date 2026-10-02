import type {
  ProjectWorkspaceLayout,
  WorkSessionCheckpoint,
  WorkSessionStage,
} from "../../../project-model/src/index.js";
import type {
  SelectedMapAuditRun,
} from "../map-audit-pipeline.js";
import {
  saveWorkSessionCheckpoint,
} from "./work-session-store.js";

function mirroredStage(
  audit: SelectedMapAuditRun,
): WorkSessionStage {
  switch (audit.currentStage) {
    case "TARGET":
    case "DISCOVERY":
      return "new";
    case "UNDERSTAND":
      return "understood";
    case "MODEL":
    case "STRESS":
      return "evidence-ready";
    case "PROVE":
    case "REPORT":
    case "COMPLETE":
      return "diagnosed";
  }
}

function evidenceIds(
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
 * Project the canonical SelectedMapAuditRun into the generic work-session
 * persistence format. The work-session stage is a mirror only and must never
 * be used to authorize or advance map-audit stages.
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
      "Refusing to mirror a SelectedMapAuditRun into a work session bound to another session/artifact.",
    );
  }

  const scenario = audit.inspection.hiddenGameplayDefects.scenarioAudit;
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
    stage: mirroredStage(audit),
    revision:
      previous === undefined
        ? 1
        : previous.revision + 1,
    references: {
      completedCapabilityIds: [
        ...audit.inspection.gameplayWorld
          .analysisExecution.executedCapabilityIds,
      ].sort(),
      evidenceIds: [...evidenceIds(audit)],
      semanticNodeIds:
        audit.inspection.gameplayIntent.model.nodes
          .map((node) => node.id)
          .sort(),
      proofClaimIds: [
        "audit-revision:" + audit.auditRevision,
        ...audit.readyDefects.map(
          (defect) => defect.causalLinkId,
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

/**
 * Persist a mirror of the current audit run. This does not advance the audit;
 * the only audit authority remains SelectedMapAuditRun / map-audit-admission.
 */
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
