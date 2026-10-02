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
} from "./map-audit-admission.js";

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
  readonly status: "READY_FOR_REVIEW" | "BLOCKED";
  readonly admission: SelectedMapAuditAdmission;
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
export async function runSelectedMapAudit(
  input: SelectedMapAuditInput,
): Promise<SelectedMapAuditRun> {
  const inspection = await inspectArtifact(
    input.artifactPath,
    input.target ?? {},
    input.knowledgeCatalog,
    input.telemetry ?? [],
    input.runtimeProbeTranscript,
  );

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
  return {
    schemaVersion: 1,
    policy: "selected-map-audit-single-entry",
    inspection,
    admission,
    status:
      admission.status === "READY"
        ? "READY_FOR_REVIEW"
        : "BLOCKED",
    blockingCheckpointIds: [
      ...procedure.blockingCheckpointIds,
    ],
    reasons: [
      ...admission.issues.map((issue) =>
        "[" + issue.stage + "] " + issue.message
      ),
    ],
  };
}

export interface ResolveSelectedMapAuditInput {
  readonly audit: SelectedMapAuditRun;
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

  return {
    schemaVersion: 1,
    policy: "selected-map-audit-single-entry",
    inspection: updatedInspection,
    admission,
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
