import type {
  KnowledgeCatalog,
} from "../../knowledge/src/index.js";
import type {
  RuntimeEvidenceRecord,
  RuntimeProbeResponse,
  TelemetryEvent,
} from "../../project-model/src/index.js";
import type {
  ApprovedBugSet,
  BugReportV2Map,
  BugReportV2RepairBy,
  ConfirmedDefectGroupResolution,
} from "../../bug-report/src/index.js";
import type {
  InspectDirectoryResult,
  InspectTargetProfile,
} from "./core/types.js";
import {
  inspectDirectory,
} from "./inspection/inspect.js";
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

export interface SelectedMapAuditInput {
  readonly root: string;
  readonly artifactId?: string;
  readonly target?: InspectTargetProfile;
  readonly sourceFingerprint?: string;
  readonly knowledgeCatalog?: KnowledgeCatalog;
  readonly externalEvidence?: readonly RuntimeEvidenceRecord[];
  readonly telemetryEvents?: readonly TelemetryEvent[];
  readonly telemetryDroppedEvents?: number;
  readonly runtimeProbeResponses?: readonly RuntimeProbeResponse[];
  readonly runtimeProbeDroppedExchanges?: number;
}

export interface SelectedMapAuditRun {
  readonly schemaVersion: 1;
  readonly policy: "selected-map-audit-single-entry";
  readonly inspection: InspectDirectoryResult;
  readonly status: "READY_FOR_REVIEW" | "BLOCKED";
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
  const inspection = await inspectDirectory(
    input.root,
    input.artifactId ?? "art_working",
    input.target ?? {},
    input.sourceFingerprint,
    input.knowledgeCatalog,
    input.externalEvidence ?? [],
    input.telemetryEvents ?? [],
    input.telemetryDroppedEvents ?? 0,
    input.runtimeProbeResponses ?? [],
    input.runtimeProbeDroppedExchanges ?? 0,
  );

  const procedure = inspection.mandatoryAuditProcedure;
  return {
    schemaVersion: 1,
    policy: "selected-map-audit-single-entry",
    inspection,
    status:
      procedure.blockingCheckpointIds.length > 0
        ? "BLOCKED"
        : "READY_FOR_REVIEW",
    blockingCheckpointIds: [
      ...procedure.blockingCheckpointIds,
    ],
    reasons: [...procedure.reasons],
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
