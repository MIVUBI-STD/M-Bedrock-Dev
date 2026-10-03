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
  SELECTED_MAP_AUDIT_STAGE_ORDER,
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
  projectReadyAuditIssues,
  type ReadyAuditIssueProjection,
} from "./map-audit-issue-projection.js";
import {
  deriveSelectedMapAuditRevision,
} from "./map-audit-revision.js";
import {
  reconcileSelectedMapAuditDemand,
  type AuditDemandReconciliation,
} from "./map-audit-demand-reconciliation.js";
import {
  deriveAuditExecutionTrace,
  type AuditExecutionTrace,
} from "./map-audit-execution-trace.js";
import {
  issueSelectedMapAuditAuthority,
} from "./map-audit-authority.js";
import {
  auditCandidateGroupCoverageIssues,
  groupReadyAuditIssuesForCandidateCoverage,
  type ReadyAuditCandidateGroup,
} from "./map-audit-candidate-grouping.js";

export type SelectedMapAuditRuntimeTarget = Pick<
  InspectTargetProfile,
  | "edition"
  | "version"
  | "educationFeatures"
  | "eduLevel"
  | "experiments"
  | "arenaProofMode"
  | "staticExecutionDimension"
>;

export interface SelectedMapAuditInput {
  /**
   * Exact selected .mcworld artifact. Production audit authority starts here.
   */
  readonly artifactPath: string;
  /**
   * Runtime/platform identity only. Map-specific behavior contracts, arena
   * layouts, state authority, and expected-behavior policy cannot enter the
   * production audit from caller-supplied target configuration.
   */
  readonly target?: SelectedMapAuditRuntimeTarget;
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
  readonly executionTrace: AuditExecutionTrace;
  readonly stageOrder: readonly SelectedMapAuditStage[];
  readonly status: "READY_FOR_REVIEW" | "BLOCKED";
  readonly admission: SelectedMapAuditAdmission;
  readonly currentStage: SelectedMapAuditStage | "COMPLETE";
  readonly allowedNextAction:
    | "RESOLVE_BLOCKING_STAGE"
    | "RESOLVE_DEFECTS"
    | "PREPARE_REVIEW";
  readonly continuation: {
    readonly owner:
      | "ENGINE_OR_EVIDENCE"
      | "DEFECT_RESOLUTION"
      | "REVIEW";
    readonly requiresNewAuditRun: boolean;
    readonly modelMayAuthorizeCompletion: boolean;
  };
  readonly modelTaskPackets: readonly AuditModelTaskPacket[];
  readonly issueLanes: {
    readonly BUG: readonly ReadyAuditIssueProjection[];
    readonly DESIGN_MISMATCH:
      readonly ReadyAuditIssueProjection[];
  };
  readonly candidateGroups: readonly ReadyAuditCandidateGroup[];
  readonly blockingCheckpointIds: readonly string[];
  readonly reasons: readonly string[];
}

function deriveSelectedMapAuditControl(input: {
  readonly admission: SelectedMapAuditAdmission;
  readonly procedure:
    InspectArtifactResult["mandatoryAuditProcedure"];
  readonly scenario:
    InspectArtifactResult["hiddenGameplayDefects"]["scenarioAudit"];
  readonly capabilityDelivery:
    InspectArtifactResult["hiddenGameplayDefects"]["capabilityDelivery"];
}): Pick<
  SelectedMapAuditRun,
  | "executionTrace"
  | "currentStage"
  | "allowedNextAction"
  | "continuation"
  | "issueLanes"
  | "candidateGroups"
  | "status"
  | "blockingCheckpointIds"
  | "reasons"
> {
  const proveAuthorized =
    input.admission.firstBlockingStage === undefined ||
    input.admission.firstBlockingStage === "PROVE" ||
    input.admission.firstBlockingStage === "REPORT";
  const allReadyIssues = proveAuthorized
    ? projectReadyAuditIssues(
        input.scenario.graph,
        input.scenario.defectResolution,
        input.capabilityDelivery,
      )
    : [];
  const issueLanes = {
    BUG: allReadyIssues.filter(
      (item) => item.issueType === "BUG",
    ),
    DESIGN_MISMATCH: allReadyIssues.filter(
      (item) =>
        item.issueType === "DESIGN_MISMATCH",
    ),
  } as const;
  const candidateGroups = proveAuthorized
    ? groupReadyAuditIssuesForCandidateCoverage(
        input.scenario.graph,
        issueLanes.BUG,
      )
    : [];
  const executionTrace = deriveAuditExecutionTrace({
    admission: input.admission,
    procedure: input.procedure,
  });
  const currentStage =
    input.admission.firstBlockingStage ?? "COMPLETE";
  const allowedNextAction =
    input.admission.status === "READY"
      ? "PREPARE_REVIEW" as const
      : input.admission.firstBlockingStage === "PROVE" &&
          (
            input.scenario.defectResolution
              .gameplayTranslationRequiredIds.length > 0 ||
            input.scenario.defectResolution
              .counterProofSearchRequiredIds.length > 0
          )
        ? "RESOLVE_DEFECTS" as const
        : "RESOLVE_BLOCKING_STAGE" as const;
  const continuation =
    allowedNextAction === "PREPARE_REVIEW"
      ? {
          owner: "REVIEW" as const,
          requiresNewAuditRun: false,
          modelMayAuthorizeCompletion: false,
        }
      : allowedNextAction === "RESOLVE_DEFECTS"
        ? {
            owner: "DEFECT_RESOLUTION" as const,
            requiresNewAuditRun: false,
            modelMayAuthorizeCompletion: true,
          }
        : {
            owner: "ENGINE_OR_EVIDENCE" as const,
            requiresNewAuditRun: true,
            modelMayAuthorizeCompletion: false,
          };

  return {
    executionTrace,
    currentStage,
    allowedNextAction,
    continuation,
    issueLanes,
    candidateGroups,
    status:
      input.admission.status === "READY"
        ? "READY_FOR_REVIEW"
        : "BLOCKED",
    blockingCheckpointIds: [
      ...input.procedure.blockingCheckpointIds,
    ],
    reasons: input.admission.issues.map((issue) =>
      "[" + issue.stage + "] " + issue.message
    ),
  };
}

/**
 * Canonical and only supported starting point for a production selected-map audit.
 *
 * Low-level inspection/analyzer functions remain available for engine development,
 * focused diagnostics, and compatibility, but must not be used as alternate
 * production audit entry points.
 */
function productionInspectTarget(
  target: SelectedMapAuditRuntimeTarget | undefined,
  requiredKnowledgeDomains:
    InspectTargetProfile["requiredKnowledgeDomains"],
): InspectTargetProfile {
  return {
    ...(target ?? {}),
    ...(requiredKnowledgeDomains === undefined
      ? {}
      : { requiredKnowledgeDomains }),
  };
}

async function inspectSelectedMapToDemandFixedPoint(
  input: SelectedMapAuditInput,
): Promise<{
  readonly inspection: InspectArtifactResult;
  readonly reconciliation: AuditDemandReconciliation;
}> {
  const initialRequiredDomains:
    NonNullable<InspectTargetProfile["requiredKnowledgeDomains"]> = [];

  const firstInspection = await inspectArtifact(
    input.artifactPath,
    productionInspectTarget(
      input.target,
      initialRequiredDomains,
    ),
    input.knowledgeCatalog,
    input.telemetry ?? [],
    input.runtimeProbeTranscript,
  );
  const firstReconciliation =
    reconcileSelectedMapAuditDemand(
      firstInspection,
      1,
    );
  if (firstReconciliation.stable) {
    return {
      inspection: firstInspection,
      reconciliation: firstReconciliation,
    };
  }

  const reconciledDomains = [
    ...new Set([
      ...initialRequiredDomains,
      ...firstReconciliation.requiredDomains,
    ]),
  ].sort();

  const secondInspection = await inspectArtifact(
    input.artifactPath,
    productionInspectTarget(
      input.target,
      reconciledDomains,
    ),
    input.knowledgeCatalog,
    input.telemetry ?? [],
    input.runtimeProbeTranscript,
  );
  const secondReconciliation =
    reconcileSelectedMapAuditDemand(
      secondInspection,
      2,
    );

  if (!secondReconciliation.stable) {
    throw new Error(
      "RIG knowledge demand did not converge after the bounded reconciliation pass. " +
        "Refusing repeated full-artifact reinspection; unresolved domain(s): " +
        secondReconciliation.missingDomains.join(", ") +
        ".",
    );
  }

  return {
    inspection: secondInspection,
    reconciliation: secondReconciliation,
  };
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
    world: inspection.gameplayWorld,
  });
  const control = deriveSelectedMapAuditControl({
    admission,
    procedure,
    scenario,
    capabilityDelivery:
      inspection.hiddenGameplayDefects
        .capabilityDelivery,
  });
  return {
    schemaVersion: 1,
    policy: "selected-map-audit-single-entry",
    inspection,
    identity,
    auditRevision,
    demandReconciliation: reconciliation,
    admission,
    stageOrder: SELECTED_MAP_AUDIT_STAGE_ORDER,
    modelTaskPackets,
    ...control,
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
    world: updatedInspection.gameplayWorld,
  });
  const control = deriveSelectedMapAuditControl({
    admission,
    procedure: mandatoryAuditProcedure,
    scenario,
    capabilityDelivery:
      hidden.capabilityDelivery,
  });

  return {
    schemaVersion: 1,
    policy: "selected-map-audit-single-entry",
    inspection: updatedInspection,
    identity,
    auditRevision,
    demandReconciliation:
      input.audit.demandReconciliation,
    admission,
    stageOrder: SELECTED_MAP_AUDIT_STAGE_ORDER,
    modelTaskPackets,
    ...control,
  };
}

function designMismatchCandidateIssues(
  audit: SelectedMapAuditRun,
  candidates: readonly AuditReportCandidate[],
): readonly string[] {
  const designMismatchLinks = new Set(
    audit.issueLanes.DESIGN_MISMATCH.map(
      (item) => item.causalLinkId,
    ),
  );
  const issues: string[] = [];

  for (const candidate of candidates) {
    if (candidate.route === "tester") continue;
    const linkIds = [
      ...new Set([
        ...(candidate.scenarioCausalLinkIds ?? []),
        ...(candidate.scenarioCausalLinkId === undefined
          ? []
          : [candidate.scenarioCausalLinkId]),
      ]),
    ];
    const wrongLane = linkIds.filter(
      (id) => designMismatchLinks.has(id),
    );
    if (wrongLane.length > 0) {
      issues.push(
        "DESIGN_MISMATCH causal link(s) cannot enter Bug Report V2 candidate promotion: " +
          wrongLane.sort().join(", ") +
          ". Keep them in audit.issueLanes.DESIGN_MISMATCH.",
      );
    }
  }

  return [...new Set(issues)].sort();
}

export interface PrepareSelectedMapAuditReviewInput {
  readonly audit: SelectedMapAuditRun;
  readonly basedOnAuditRevision: string;
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
  if (
    input.basedOnAuditRevision !==
    input.audit.auditRevision
  ) {
    return {
      collection: collectConfirmedDefects(
        input.candidates,
        input.engineeringAnalyses ??
          inspection.engineeringAnalyses,
      ),
      blocked: true,
      reasons: [
        "Review candidate set was produced from a stale auditRevision.",
      ],
    };
  }
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
  const rootCauseIssues = [
    ...auditCandidateGroupCoverageIssues(
      input.audit.candidateGroups,
      input.candidates,
    ),
    ...designMismatchCandidateIssues(
      input.audit,
      input.candidates,
    ),
  ];
  if (rootCauseIssues.length > 0) {
    return {
      collection: collectConfirmedDefects(
        input.candidates,
        input.engineeringAnalyses ??
          inspection.engineeringAnalyses,
      ),
      blocked: true,
      reasons: rootCauseIssues,
    };
  }

  const auditAuthority =
    issueSelectedMapAuditAuthority({
      auditRevision: input.audit.auditRevision,
      artifactFingerprint:
        input.audit.identity.artifactFingerprint,
    });
  return prepareBugReportReviewFromAuditCandidates({
    map: input.map,
    auditAuthority,
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

export interface BuildSelectedMapAuditReportResult
  extends BuildBugReportFromAuditResult {
  readonly designMismatches:
    readonly ReadyAuditIssueProjection[];
}

/**
 * Canonical production-report continuation. It cannot be called without the
 * original SelectedMapAuditRun and therefore cannot bypass procedure closure.
 */
export function buildSelectedMapAuditReport(
  input: BuildSelectedMapAuditReportInput,
): BuildSelectedMapAuditReportResult {
  const inspection = input.audit.inspection;
  if (
    input.basedOnAuditRevision !==
    input.audit.auditRevision
  ) {
    return {
      designMismatches:
        input.audit.issueLanes.DESIGN_MISMATCH,
      collection: collectConfirmedDefects(
        input.candidates,
        input.engineeringAnalyses ??
          inspection.engineeringAnalyses,
      ),
      promotion: {
        ok: false,
        issues: [{
          code: "invalid-confirmed-defect" as const,
          message:
            "Report build input was produced from a stale auditRevision.",
        }],
      },
    };
  }
  const scenario =
    inspection.hiddenGameplayDefects.scenarioAudit;
  const identityIssues =
    selectedMapReportIdentityIssues(
      input.audit.identity,
      input.map,
    );
  if (identityIssues.length > 0) {
    return {
      designMismatches:
        input.audit.issueLanes.DESIGN_MISMATCH,
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
  const rootCauseIssues = [
    ...auditCandidateGroupCoverageIssues(
      input.audit.candidateGroups,
      input.candidates,
    ),
    ...designMismatchCandidateIssues(
      input.audit,
      input.candidates,
    ),
  ];
  if (rootCauseIssues.length > 0) {
    return {
      designMismatches:
        input.audit.issueLanes.DESIGN_MISMATCH,
      collection: collectConfirmedDefects(
        input.candidates,
        input.engineeringAnalyses ??
          inspection.engineeringAnalyses,
      ),
      promotion: {
        ok: false,
        issues: rootCauseIssues.map((message) => ({
          code: "invalid-confirmed-defect" as const,
          message,
        })),
      },
    };
  }

  const auditAuthority =
    issueSelectedMapAuditAuthority({
      auditRevision: input.audit.auditRevision,
      artifactFingerprint:
        input.audit.identity.artifactFingerprint,
    });
  const bugReport =
    buildBugReportFromAuditCandidates({
    map: input.map,
    auditAuthority,
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

  return {
    ...bugReport,
    designMismatches:
      input.audit.issueLanes.DESIGN_MISMATCH,
  };
}
