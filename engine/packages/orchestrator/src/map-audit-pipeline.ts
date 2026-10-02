import type {
  KnowledgeCatalog,
} from "../../knowledge/src/index.js";
import type {
  RuntimeProbeTranscript,
  TelemetryBatch,
  TelemetryEvent,
} from "../../project-model/src/index.js";
import type {
  ApprovedBugSet,
  BugReportV2Map,
  BugReportV2RepairBy,
  ConfirmedDefectGroupResolution,
} from "../../bug-report/src/index.js";
import type {
  InspectTargetProfile,
} from "./core/types.js";
import {
  inspectArtifact,
  type InspectArtifactResult,
} from "./inspection/inspect-artifact.js";
import {
  buildBugReportFromAuditCandidates,
  collectConfirmedDefects,
  prepareBugReportReviewFromAuditCandidates,
  type AuditReportCandidate,
  type BuildBugReportFromAuditResult,
  type PrepareBugReportReviewFromClosedAuditResult,
} from "./reporting/report-defect-collector.js";
import type {
  InspectionEngineeringAnalysis,
} from "./inspection/engineering-analysis-stage.js";
import type {
  GameplayDefectResolution,
} from "./inspection/gameplay-defect-resolution.js";
import {
  refreshHiddenGameplayDefectsForWorld,
} from "./inspection/hidden-gameplay-defect-analysis.js";
import {
  deriveMandatoryAuditProcedureReceipt,
} from "./inspection/mandatory-audit-procedure.js";
import {
  assessSelectedMapAuditAdmission,
  type SelectedMapAuditAdmission,
  type SelectedMapAuditStage,
} from "./map-audit-admission.js";
import {
  deriveAuditModelTaskPackets,
  type AuditModelTaskPacket,
} from "./map-audit-model-task.js";
import {
  deriveSelectedMapAuditIdentity,
  selectedMapReportIdentityIssues,
  type SelectedMapAuditIdentity,
} from "./map-audit-identity.js";
import {
  projectReadyAuditDefects,
  type ReadyAuditDefectProjection,
} from "./map-audit-defect-projection.js";
import {
  deriveSelectedMapAuditRevision,
} from "./map-audit-revision.js";
import {
  reconcileSelectedMapAuditDemand,
  type AuditDemandReconciliation,
} from "./map-audit-demand-reconciliation.js";

export interface SelectedMapAuditInput {
  /**
   * Exact selected .mcworld artifact. Production audit authority starts here.
   */
  readonly artifactPath: string;
  readonly target?: InspectTargetProfile;
  readonly knowledgeCatalog?: KnowledgeCatalog;
  readonly telemetry?: readonly TelemetryEvent[] | TelemetryBatch;
  readonly runtimeProbeTranscript?: RuntimeProbeTranscript;
}

export interface SelectedMapAuditRun {
  readonly schemaVersion: 1;
  readonly policy: "selected-map-audit-single-entry";
  readonly inspection: InspectArtifactResult;
  readonly identity: SelectedMapAuditIdentity;
  readonly auditRevision: string;
  readonly demandReconciliation: AuditDemandReconciliation;
  readonly status: "READY_FOR_REVIEW" | "BLOCKED";
  readonly admission: SelectedMapAuditAdmission;
  readonly currentStage: SelectedMapAuditStage | "COMPLETE";
  readonly allowedNextAction:
    | "RESOLVE_BLOCKING_STAGE"
    | "RESOLVE_DEFECTS"
    | "PREPARE_REVIEW";
  readonly modelTaskPackets: readonly AuditModelTaskPacket[];
  readonly readyDefects: readonly ReadyAuditDefectProjection[];
  readonly blockingCheckpointIds: readonly string[];
  readonly reasons: readonly string[];
}

/**
 * Canonical and only supported starting point for a production selected-map audit.
 *
 * Low-level inspection/analyzer functions remain available for engine development,
 * focused diagnostics, and compatibility, but must not be used as alternate
 * production audit entry points.
 */
async function inspectSelectedMapToDemandFixedPoint(
  input: SelectedMapAuditInput,
): Promise<{
  readonly inspection: InspectArtifactResult;
  readonly reconciliation: AuditDemandReconciliation;
}> {
  let requiredKnowledgeDomains =
    [...new Set(
      input.target?.requiredKnowledgeDomains ?? [],
    )].sort();
  let lastMissingKey = "";

  for (let iteration = 0; iteration < 16; iteration += 1) {
    const inspection = await inspectArtifact(
      input.artifactPath,
      {
        ...(input.target ?? {}),
        requiredKnowledgeDomains,
      },
      input.knowledgeCatalog,
      input.telemetry ?? [],
      input.runtimeProbeTranscript,
    );
    const reconciliation =
      reconcileSelectedMapAuditDemand(inspection);
    if (reconciliation.stable) {
      return { inspection, reconciliation };
    }

    const next = [
      ...new Set([
        ...requiredKnowledgeDomains,
        ...reconciliation.missingDomains,
      ]),
    ].sort();
    const nextKey = next.join("|");
    if (
      nextKey === lastMissingKey ||
      next.length === requiredKnowledgeDomains.length
    ) {
      throw new Error(
        "RIG demand reconciliation stalled before reaching a fixed point: " +
          reconciliation.missingDomains.join(", ") +
          ".",
      );
    }
    lastMissingKey = nextKey;
    requiredKnowledgeDomains = next;
  }

  throw new Error(
    "RIG demand reconciliation exceeded the finite knowledge-domain convergence bound.",
  );
}

/**
 * Canonical and only supported starting point for a production selected-map audit.
 * Demand is reconciled monotonically until final RIG requirements are covered.
 */
export async function runSelectedMapAudit(
  input: SelectedMapAuditInput,
): Promise<SelectedMapAuditRun> {
  const { inspection, reconciliation } =
    await inspectSelectedMapToDemandFixedPoint(input);

  const identity =
    deriveSelectedMapAuditIdentity(inspection);
  const procedure = inspection.mandatoryAuditProcedure;
  const scenario =
    inspection.hiddenGameplayDefects.scenarioAudit;
  const admission = assessSelectedMapAuditAdmission({
    mandatoryAuditProcedure: procedure,
    gameplayDiscoveryClosure:
      inspection.gameplayDiscoveryClosure,
    gameplayClosure:
      inspection.gameplayWorld.gameplayClosure,
    gameplayScenarioClosure:
      scenario.closure,
    gameplayDefectResolution:
      scenario.defectResolution,
  });
  const auditRevision = deriveSelectedMapAuditRevision({
    identity,
    admission,
    procedure,
    graph: scenario.graph,
    defectResolution: scenario.defectResolution,
  });
  const modelTaskPackets = deriveAuditModelTaskPackets({
    admission,
    procedure,
    graph: scenario.graph,
    defectResolution: scenario.defectResolution,
    intent: inspection.gameplayIntent.model,
    auditRevision,
  });
  const readyDefects = projectReadyAuditDefects(
    scenario.graph,
    scenario.defectResolution,
  );
  const currentStage =
    admission.firstBlockingStage ?? "COMPLETE";
  const allowedNextAction =
    admission.status === "READY"
      ? "PREPARE_REVIEW" as const
      : admission.firstBlockingStage === "PROVE" &&
          (
            scenario.defectResolution
              .gameplayTranslationRequiredIds.length > 0 ||
            scenario.defectResolution
              .counterProofSearchRequiredIds.length > 0
          )
        ? "RESOLVE_DEFECTS" as const
        : "RESOLVE_BLOCKING_STAGE" as const;
  return {
    schemaVersion: 1,
    policy: "selected-map-audit-single-entry",
    inspection,
    identity,
    auditRevision,
    demandReconciliation: reconciliation,
    admission,
    currentStage,
    allowedNextAction,
    modelTaskPackets,
    readyDefects,
    status:
      admission.status === "READY"
        ? "READY_FOR_REVIEW"
        : "BLOCKED",
    blockingCheckpointIds: [
      ...procedure.blockingCheckpointIds,
    ],
    reasons: admission.issues.map((issue) =>
      "[" + issue.stage + "] " + issue.message
    ),
  };
}

export interface ResolveSelectedMapAuditInput {
  readonly audit: SelectedMapAuditRun;
  readonly basedOnAuditRevision: string;
  readonly resolutions:
    readonly GameplayDefectResolution[];
}

/**
 * Canonical continuation for source-side defect resolution.
 * It preserves the exact selected-artifact snapshot and recomputes only the
 * resolution-dependent analysis, procedure closure, and ordered admission.
 */
export function resolveSelectedMapAudit(
  input: ResolveSelectedMapAuditInput,
): SelectedMapAuditRun {
  if (
    input.basedOnAuditRevision !==
    input.audit.auditRevision
  ) {
    throw new Error(
      "Refusing stale audit resolution: model/result revision does not match the current SelectedMapAuditRun.",
    );
  }
  const inspection = input.audit.inspection;
  const hidden = refreshHiddenGameplayDefectsForWorld(
    inspection.hiddenGameplayDefects,
    inspection.gameplayWorld,
    inspection.gameplayIntent.model,
    input.resolutions,
  );
  const mandatoryAuditProcedure =
    deriveMandatoryAuditProcedureReceipt({
      artifactId: inspection.artifactId,
      discovery:
        inspection.gameplayDiscoveryClosure,
      world: inspection.gameplayWorld,
      intent: inspection.gameplayIntent.model,
      semanticIr: inspection.semanticIrModel,
      boundaries:
        inspection.gameplayBoundaries,
      multiplayer:
        inspection.multiplayerStateValidation,
      hidden,
    });
  const updatedInspection: InspectArtifactResult = {
    ...inspection,
    hiddenGameplayDefects: hidden,
    mandatoryAuditProcedure,
  };
  const identity =
    deriveSelectedMapAuditIdentity(updatedInspection);
  const scenario = hidden.scenarioAudit;
  const admission = assessSelectedMapAuditAdmission({
    mandatoryAuditProcedure,
    gameplayDiscoveryClosure:
      updatedInspection.gameplayDiscoveryClosure,
    gameplayClosure:
      updatedInspection.gameplayWorld.gameplayClosure,
    gameplayScenarioClosure:
      scenario.closure,
    gameplayDefectResolution:
      scenario.defectResolution,
  });

  const auditRevision = deriveSelectedMapAuditRevision({
    identity,
    admission,
    procedure: mandatoryAuditProcedure,
    graph: scenario.graph,
    defectResolution: scenario.defectResolution,
  });
  const modelTaskPackets = deriveAuditModelTaskPackets({
    admission,
    procedure: mandatoryAuditProcedure,
    graph: scenario.graph,
    defectResolution: scenario.defectResolution,
    intent: updatedInspection.gameplayIntent.model,
    auditRevision,
  });
  const readyDefects = projectReadyAuditDefects(
    scenario.graph,
    scenario.defectResolution,
  );
  const currentStage =
    admission.firstBlockingStage ?? "COMPLETE";
  const allowedNextAction =
    admission.status === "READY"
      ? "PREPARE_REVIEW" as const
      : admission.firstBlockingStage === "PROVE" &&
          (
            scenario.defectResolution
              .gameplayTranslationRequiredIds.length > 0 ||
            scenario.defectResolution
              .counterProofSearchRequiredIds.length > 0
          )
        ? "RESOLVE_DEFECTS" as const
        : "RESOLVE_BLOCKING_STAGE" as const;

  return {
    schemaVersion: 1,
    policy: "selected-map-audit-single-entry",
    inspection: updatedInspection,
    identity,
    auditRevision,
    demandReconciliation:
      input.audit.demandReconciliation,
    admission,
    currentStage,
    allowedNextAction,
    modelTaskPackets,
    readyDefects,
    status:
      admission.status === "READY"
        ? "READY_FOR_REVIEW"
        : "BLOCKED",
    blockingCheckpointIds: [
      ...mandatoryAuditProcedure.blockingCheckpointIds,
    ],
    reasons: admission.issues.map((issue) =>
      "[" + issue.stage + "] " + issue.message
    ),
  };
}

export interface PrepareSelectedMapAuditReviewInput {
  readonly audit: SelectedMapAuditRun;
  readonly map: BugReportV2Map;
  readonly candidates: readonly AuditReportCandidate[];
  readonly engineeringAnalyses?: readonly InspectionEngineeringAnalysis[];
  readonly groupResolutions?: readonly ConfirmedDefectGroupResolution[];
}

/**
 * Canonical review continuation. It derives every closure gate from the
 * original audit run, so callers cannot accidentally omit or replace one.
 */
export function prepareSelectedMapAuditReview(
  input: PrepareSelectedMapAuditReviewInput,
): PrepareBugReportReviewFromClosedAuditResult {
  const inspection = input.audit.inspection;
  const scenario =
    inspection.hiddenGameplayDefects.scenarioAudit;
  const identityIssues =
    selectedMapReportIdentityIssues(
      input.audit.identity,
      input.map,
    );
  if (identityIssues.length > 0) {
    return {
      collection: collectConfirmedDefects(
        input.candidates,
        input.engineeringAnalyses ??
          inspection.engineeringAnalyses,
      ),
      blocked: true,
      reasons: identityIssues,
    };
  }

  return prepareBugReportReviewFromAuditCandidates({
    map: input.map,
    files: inspection.fileInventory,
    candidates: input.candidates,
    engineeringAnalyses:
      input.engineeringAnalyses ??
      inspection.engineeringAnalyses,
    ...(input.groupResolutions === undefined
      ? {}
      : { groupResolutions: input.groupResolutions }),
    gameplayDiscoveryClosure:
      inspection.gameplayDiscoveryClosure,
    gameplayClosure:
      inspection.gameplayWorld.gameplayClosure,
    gameplayScenarioClosure:
      scenario.closure,
    gameplayDefectResolution:
      scenario.defectResolution,
    mandatoryAuditProcedure:
      inspection.mandatoryAuditProcedure,
  });
}

export interface BuildSelectedMapAuditReportInput
  extends PrepareSelectedMapAuditReviewInput {
  readonly approved: ApprovedBugSet;
  readonly repairBy: BugReportV2RepairBy;
}

/**
 * Canonical production-report continuation. It cannot be called without the
 * original SelectedMapAuditRun and therefore cannot bypass procedure closure.
 */
export function buildSelectedMapAuditReport(
  input: BuildSelectedMapAuditReportInput,
): BuildBugReportFromAuditResult {
  const inspection = input.audit.inspection;
  const scenario =
    inspection.hiddenGameplayDefects.scenarioAudit;
  const identityIssues =
    selectedMapReportIdentityIssues(
      input.audit.identity,
      input.map,
    );
  if (identityIssues.length > 0) {
    return {
      collection: collectConfirmedDefects(
        input.candidates,
        input.engineeringAnalyses ??
          inspection.engineeringAnalyses,
      ),
      promotion: {
        ok: false,
        issues: identityIssues.map((message) => ({
          code: "invalid-confirmed-defect" as const,
          message,
        })),
      },
    };
  }

  return buildBugReportFromAuditCandidates({
    map: input.map,
    repairBy: input.repairBy,
    approved: input.approved,
    files: inspection.fileInventory,
    candidates: input.candidates,
    engineeringAnalyses:
      input.engineeringAnalyses ??
      inspection.engineeringAnalyses,
    ...(input.groupResolutions === undefined
      ? {}
      : { groupResolutions: input.groupResolutions }),
    gameplayDiscoveryClosure:
      inspection.gameplayDiscoveryClosure,
    gameplayClosure:
      inspection.gameplayWorld.gameplayClosure,
    gameplayScenarioClosure:
      scenario.closure,
    gameplayDefectResolution:
      scenario.defectResolution,
    mandatoryAuditProcedure:
      inspection.mandatoryAuditProcedure,
  });
}
