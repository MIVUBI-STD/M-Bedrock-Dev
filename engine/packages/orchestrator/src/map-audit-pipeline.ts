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
  type AuditIssueProjection,
  type NeedValidationAuditIssueProjection,
  type ReadyAuditIssueProjection,
} from "./map-audit-issue-projection.js";
import {
  projectNeedValidationAuditIssues,
} from "./map-audit-validation-projection.js";
import {
  groupNeedValidationTests,
  type AuditValidationTestGroup,
} from "./map-audit-validation-plan.js";
import {
  deriveAuditObligations,
  type AuditObligation,
} from "./map-audit-obligations.js";
import {
  buildAuditProofNavigation,
} from "./map-audit-proof-navigation.js";
import {
  projectMapAuditOutputV2,
  type MapAuditOutputV2,
} from "./map-audit-output-v2.js";
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
  assessAuditHonesty,
  type AuditHonestyAssessment,
} from "./map-audit-honesty.js";
import {
  buildFullMapReplicaReceipt,
  type FullMapReplicaReceipt,
} from "./arena/full-map-replica-receipt.js";
import {
  normalizeAuditUserIntent,
  validateAuditUserIntent,
  type AuditUserIntentEnvelope,
} from "./map-audit-user-intent.js";
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
  /**
   * Structured interpretation of the user's wording.
   * Search guidance only; never gameplay authority or report proof.
   */
  readonly userIntent?: AuditUserIntentEnvelope;
}

export interface SelectedMapAuditRun {
  readonly schemaVersion: 1;
  readonly policy: "selected-map-audit-single-entry";
  readonly inspection: InspectArtifactResult;
  readonly identity: SelectedMapAuditIdentity;
  readonly auditRevision: string;
  readonly userIntent?: AuditUserIntentEnvelope;
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
  /**
   * Bounded proof-improvement tasks. When allowedNextAction is PREPARE_REVIEW,
   * these packets are optional attempts to promote NEED_VALIDATION; they are
   * not a second blocking workflow.
   */
  readonly modelTaskPackets: readonly AuditModelTaskPacket[];
  readonly mapAuditReport: MapAuditOutputV2;
  readonly issueLanes: {
    readonly BUG: readonly AuditIssueProjection[];
    readonly DESIGN_MISMATCH:
      readonly AuditIssueProjection[];
  };
  readonly candidateGroups: readonly ReadyAuditCandidateGroup[];
  readonly auditObligations: readonly AuditObligation[];
  readonly validationTests: readonly AuditValidationTestGroup[];
  readonly fullMapReplica?: FullMapReplicaReceipt;
  readonly honesty: AuditHonestyAssessment;
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
  readonly negativeSpace:
    InspectArtifactResult["hiddenGameplayDefects"]["negativeSpace"];
  readonly temporalRisks:
    InspectArtifactResult["hiddenGameplayDefects"]["temporalRisks"];
  readonly gameplayClosure:
    InspectArtifactResult["gameplayWorld"]["gameplayClosure"];
  readonly gameplayWorld:
    InspectArtifactResult["gameplayWorld"];
  readonly discoveryChallenges:
    InspectArtifactResult["hiddenGameplayDefects"]["discoveryChallenges"];
  readonly sharedResourceSignals:
    InspectArtifactResult["hiddenGameplayDefects"]["sharedResourceOwnership"]["signals"];
  readonly compoundBoundaries:
    InspectArtifactResult["hiddenGameplayDefects"]["compoundBoundaries"];
  readonly accumulationGrowth:
    InspectArtifactResult["hiddenGameplayDefects"]["accumulationGrowth"];
}): Pick<
  SelectedMapAuditRun,
  | "executionTrace"
  | "currentStage"
  | "allowedNextAction"
  | "continuation"
  | "issueLanes"
  | "candidateGroups"
  | "auditObligations"
  | "validationTests"
  | "fullMapReplica"
  | "honesty"
  | "status"
  | "blockingCheckpointIds"
  | "reasons"
> {
  const firstBlockingStage =
    input.admission.firstBlockingStage;
  const firstBlockingIndex =
    firstBlockingStage === undefined
      ? Number.POSITIVE_INFINITY
      : SELECTED_MAP_AUDIT_STAGE_ORDER.indexOf(
          firstBlockingStage,
        );
  const stageAuthorized = (
    stage: SelectedMapAuditStage,
  ): boolean =>
    SELECTED_MAP_AUDIT_STAGE_ORDER.indexOf(stage) <=
    firstBlockingIndex;

  const proveAuthorized = stageAuthorized("PROVE");
  const provenIssues = proveAuthorized
    ? projectReadyAuditIssues(
        input.scenario.graph,
        input.scenario.defectResolution,
        input.capabilityDelivery,
      )
    : [];
  const needValidationIssues = proveAuthorized
    ? projectNeedValidationAuditIssues(
        input.scenario.graph,
        input.scenario.defectResolution,
        input.capabilityDelivery,
      )
    : [];
  const replicaDivergenceIds =
    input.gameplayWorld.arenas.replicaProof
      .filter((item) =>
        item.status === "diverged" ||
        item.mismatchCount > 0
      )
      .map((item) =>
        "replica-delta:" + item.arenaId
      )
      .sort();

  const auditObligations =
    deriveAuditObligations({
      graph: input.scenario.graph,
      defectResolution:
        input.scenario.defectResolution,
      gameplayWorld:
        input.gameplayWorld,
      userIntent,
      gameplayClosure: input.gameplayClosure,
      negativeSpace:
        stageAuthorized("STRESS")
          ? input.negativeSpace
          : [],
      temporalRisks:
        stageAuthorized("STRESS")
          ? input.temporalRisks
          : [],
      discoveryChallenges:
        stageAuthorized("DISCOVERY")
          ? input.discoveryChallenges
          : [],
      sharedResourceSignals:
        stageAuthorized("UNDERSTAND")
          ? input.sharedResourceSignals
          : [],
      compoundBoundaries:
        stageAuthorized("STRESS")
          ? input.compoundBoundaries
          : [],
      accumulationGrowth:
        stageAuthorized("STRESS")
          ? input.accumulationGrowth
          : [],
      replicaDivergenceIds:
        stageAuthorized("MODEL")
          ? replicaDivergenceIds
          : [],
    }).filter((item) =>
      stageAuthorized(item.stage)
    );

  const navigatedNeedValidationIssues = [
    ...needValidationIssues,
  ].map((item) => ({
    ...item,
    proofNavigation:
      buildAuditProofNavigation(
        item,
        input.gameplayWorld ?? undefined,
      ),
  }));
  const allVisibleIssues: readonly AuditIssueProjection[] = [
    ...provenIssues,
    ...navigatedNeedValidationIssues,
  ];
  const validationTests = groupNeedValidationTests(
    navigatedNeedValidationIssues,
  );
  const fullMapReplica =
    input.gameplayWorld.arenas.replicaProof.length === 0 ||
    input.gameplayWorld.arenas.replicaBaselineId === undefined
      ? undefined
      : buildFullMapReplicaReceipt({
          replicaBaseline:
            input.gameplayWorld.arenas.replicaBaselineId,
          replicas:
            input.gameplayWorld.arenas.replicaProof.map(
              (item) => ({
                replicaId: item.arenaId,
                proofStatus: item.status,
                mismatchCount:
                  item.mismatchCount,
                evidenceIds:
                  item.evidenceIds,
              }),
            ),
        });
  const honesty = assessAuditHonesty({
    graph: input.scenario.graph,
    gate: input.scenario.defectResolution,
    gameplayClosure: input.gameplayClosure,
    negativeSpace: input.negativeSpace,
    temporalRisks: input.temporalRisks,
    discoveryChallenges:
      input.discoveryChallenges,
    sharedResourceSignals:
      input.sharedResourceSignals,
    compoundBoundaries:
      input.compoundBoundaries,
    accumulationGrowth:
      input.accumulationGrowth,
    replicaDivergenceIds,
    visibleIssues: allVisibleIssues,
    visibleObligationIds:
      auditObligations.map((item) => item.id),
  });
  const issueLanes = {
    BUG: allVisibleIssues.filter(
      (item) => item.issueType === "BUG",
    ),
    DESIGN_MISMATCH: allVisibleIssues.filter(
      (item) =>
        item.issueType === "DESIGN_MISMATCH",
    ),
  } as const;
  const candidateGroups = proveAuthorized
    ? groupReadyAuditIssuesForCandidateCoverage(
        input.scenario.graph,
        issueLanes.BUG.filter(
          (item): item is ReadyAuditIssueProjection =>
            item.status === "PROVEN",
        ),
      )
    : [];
  const executionTrace = deriveAuditExecutionTrace({
    admission: input.admission,
    procedure: input.procedure,
  });
  const readyForReview =
    input.admission.status === "READY" &&
    honesty.status === "PASS";
  const currentStage =
    firstBlockingStage ??
    (readyForReview ? "COMPLETE" : "REPORT");
  const allowedNextAction =
    readyForReview
      ? "PREPARE_REVIEW" as const
      : firstBlockingStage === "PROVE" &&
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
    auditObligations,
    validationTests,
    ...(fullMapReplica === undefined
      ? {}
      : { fullMapReplica }),
    honesty,
    status:
      readyForReview
        ? "READY_FOR_REVIEW"
        : "BLOCKED",
    blockingCheckpointIds: [
      ...input.procedure.blockingCheckpointIds,
    ],
    reasons: [
      ...input.admission.issues.map((issue) =>
        "[" + issue.stage + "] " + issue.message
      ),
      ...(honesty.status === "PASS"
        ? []
        : honesty.reasons.map(
            (reason) =>
              "[HONESTY] " + reason,
          )),
    ],
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

function assembleSelectedMapAuditRun(
  inspection: InspectArtifactResult,
  reconciliation: AuditDemandReconciliation,
  userIntent?: AuditUserIntentEnvelope,
): SelectedMapAuditRun {
  const identity =
    deriveSelectedMapAuditIdentity(inspection);
  const procedure =
    inspection.mandatoryAuditProcedure;
  const hidden =
    inspection.hiddenGameplayDefects;
  const scenario = hidden.scenarioAudit;
  const admission = assessSelectedMapAuditAdmission({
    mandatoryAuditProcedure: procedure,
  });
  const auditRevision = deriveSelectedMapAuditRevision({
    identity,
    admission,
    procedure,
    graph: scenario.graph,
    defectResolution: scenario.defectResolution,
  });
  const control = deriveSelectedMapAuditControl({
    admission,
    procedure,
    scenario,
    capabilityDelivery:
      hidden.capabilityDelivery,
    negativeSpace:
      hidden.negativeSpace,
    temporalRisks:
      hidden.temporalRisks,
    gameplayClosure:
      inspection.gameplayWorld.gameplayClosure,
    gameplayWorld:
      inspection.gameplayWorld,
    discoveryChallenges:
      hidden.discoveryChallenges,
    sharedResourceSignals:
      hidden.sharedResourceOwnership.signals,
    compoundBoundaries:
      hidden.compoundBoundaries,
    accumulationGrowth:
      hidden.accumulationGrowth,
  });
  const needValidationFindings = [
    ...control.issueLanes.BUG,
    ...control.issueLanes.DESIGN_MISMATCH,
  ].filter(
    (item): item is NeedValidationAuditIssueProjection =>
      item.status === "NEED_VALIDATION",
  );
  const modelTaskPackets = deriveAuditModelTaskPackets({
    admission,
    procedure,
    graph: scenario.graph,
    defectResolution: scenario.defectResolution,
    intent: inspection.gameplayIntent.model,
    auditRevision,
    world: inspection.gameplayWorld,
    userIntent,
    needValidationFindings,
    auditObligations:
      control.auditObligations,
  });
  const mapAuditReport =
    projectMapAuditOutputV2({
      inspection,
      identity,
      issueLanes: control.issueLanes,
      auditObligations:
        control.auditObligations,
      validationTests:
        control.validationTests,
      honesty: control.honesty,
      ...(userIntent === undefined
        ? {}
        : { userIntent }),
      control: {
        status: control.status,
        currentStage: control.currentStage,
        allowedNextAction:
          control.allowedNextAction,
        continuationOwner:
          control.continuation.owner,
        requiresNewAuditRun:
          control.continuation.requiresNewAuditRun,
        blockingCheckpointIds:
          [...control.blockingCheckpointIds],
        reasons: [...control.reasons],
      },
      ...(control.fullMapReplica === undefined
        ? {}
        : {
            fullMapReplica:
              control.fullMapReplica,
          }),
    });

  return {
    schemaVersion: 1,
    policy: "selected-map-audit-single-entry",
    inspection,
    identity,
    auditRevision,
    ...(userIntent === undefined
      ? {}
      : { userIntent }),
    demandReconciliation: reconciliation,
    admission,
    stageOrder: SELECTED_MAP_AUDIT_STAGE_ORDER,
    modelTaskPackets,
    mapAuditReport,
    ...control,
  };
}

/**
 * Canonical and only supported starting point for a production selected-map audit.
 * Demand is reconciled monotonically until final RIG requirements are covered.
 */
export async function runSelectedMapAudit(
  input: SelectedMapAuditInput,
): Promise<SelectedMapAuditRun> {
  const userIntent =
    input.userIntent === undefined
      ? undefined
      : normalizeAuditUserIntent(input.userIntent);
  if (userIntent !== undefined) {
    const issues =
      validateAuditUserIntent(userIntent);
    if (issues.length > 0) {
      throw new Error(
        "Invalid non-authoritative user audit intent: " +
          issues.join("; "),
      );
    }
  }

  const { inspection, reconciliation } =
    await inspectSelectedMapToDemandFixedPoint(input);

  return assembleSelectedMapAuditRun(
    inspection,
    reconciliation,
    userIntent,
  );
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
  return assembleSelectedMapAuditRun(
    updatedInspection,
    input.audit.demandReconciliation,
    input.audit.userIntent,
  );
}

function designMismatchCandidateIssues(
  audit: SelectedMapAuditRun,
  candidates: readonly AuditReportCandidate[],
): readonly string[] {
  const designMismatchLinks = new Set(
    audit.issueLanes.DESIGN_MISMATCH
      .filter((item) => item.status === "PROVEN")
      .map((item) => item.causalLinkId),
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

function selectedMapAuditReviewAuthorityIssues(
  audit: SelectedMapAuditRun,
): readonly string[] {
  const issues: string[] = [];

  if (audit.status !== "READY_FOR_REVIEW") {
    issues.push(
      "Selected-map audit is not READY_FOR_REVIEW.",
    );
  }
  if (audit.honesty.status !== "PASS") {
    issues.push(
      "Selected-map audit honesty gate is not PASS.",
    );
  }
  if (
    audit.currentStage !== "COMPLETE" ||
    audit.allowedNextAction !== "PREPARE_REVIEW" ||
    audit.continuation.owner !== "REVIEW"
  ) {
    issues.push(
      "Selected-map audit control state does not authorize review continuation.",
    );
  }

  return issues;
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
  const authorityIssues =
    selectedMapAuditReviewAuthorityIssues(
      input.audit,
    );
  if (authorityIssues.length > 0) {
    return {
      collection: collectConfirmedDefects(
        input.candidates,
        input.engineeringAnalyses ??
          inspection.engineeringAnalyses,
      ),
      blocked: true,
      reasons: authorityIssues,
    };
  }
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
  /**
   * Complete human-facing audit finding set. This is the honest report surface:
   * no material PROVEN or NEED_VALIDATION finding may disappear here.
   */
  readonly findings: {
    readonly BUG: readonly AuditIssueProjection[];
    readonly DESIGN_MISMATCH:
      readonly AuditIssueProjection[];
  };
  readonly proven:
    readonly ReadyAuditIssueProjection[];
  readonly needValidation:
    readonly NeedValidationAuditIssueProjection[];
  readonly designMismatches:
    readonly AuditIssueProjection[];
  readonly auditObligations:
    readonly AuditObligation[];
  readonly validationTests:
    readonly AuditValidationTestGroup[];
  readonly fullMapReplica?: FullMapReplicaReceipt;
}

function completeSelectedMapAuditFindingProjection(
  audit: SelectedMapAuditRun,
): Pick<
  BuildSelectedMapAuditReportResult,
  | "findings"
  | "proven"
  | "needValidation"
  | "designMismatches"
  | "auditObligations"
  | "validationTests"
  | "fullMapReplica"
> {
  const all = [
    ...audit.issueLanes.BUG,
    ...audit.issueLanes.DESIGN_MISMATCH,
  ];
  return {
    findings: {
      BUG: audit.issueLanes.BUG,
      DESIGN_MISMATCH:
        audit.issueLanes.DESIGN_MISMATCH,
    },
    proven: all.filter(
      (item): item is ReadyAuditIssueProjection =>
        item.status === "PROVEN",
    ),
    needValidation: all.filter(
      (item): item is NeedValidationAuditIssueProjection =>
        item.status === "NEED_VALIDATION",
    ),
    designMismatches:
      audit.issueLanes.DESIGN_MISMATCH,
    auditObligations:
      audit.auditObligations,
    validationTests:
      audit.validationTests,
    ...(audit.fullMapReplica === undefined
      ? {}
      : {
          fullMapReplica:
            audit.fullMapReplica,
        }),
  };
}

/**
 * Canonical production-report continuation. It cannot be called without the
 * original SelectedMapAuditRun and therefore cannot bypass procedure closure.
 */
export function buildSelectedMapAuditReport(
  input: BuildSelectedMapAuditReportInput,
): BuildSelectedMapAuditReportResult {
  const inspection = input.audit.inspection;
  const authorityIssues =
    selectedMapAuditReviewAuthorityIssues(
      input.audit,
    );
  if (authorityIssues.length > 0) {
    return {
      ...completeSelectedMapAuditFindingProjection(
        input.audit,
      ),
      collection: collectConfirmedDefects(
        input.candidates,
        input.engineeringAnalyses ??
          inspection.engineeringAnalyses,
      ),
      promotion: {
        ok: false,
        issues: authorityIssues.map((message) => ({
          code: "invalid-confirmed-defect" as const,
          message,
        })),
      },
    };
  }
  if (
    input.basedOnAuditRevision !==
    input.audit.auditRevision
  ) {
    return {
      ...completeSelectedMapAuditFindingProjection(
        input.audit,
      ),
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
      ...completeSelectedMapAuditFindingProjection(
        input.audit,
      ),
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
      ...completeSelectedMapAuditFindingProjection(
        input.audit,
      ),
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
    gameplayDefectResolution:
      scenario.defectResolution,
    mandatoryAuditProcedure:
      inspection.mandatoryAuditProcedure,
  });

  return {
    ...bugReport,
    ...completeSelectedMapAuditFindingProjection(
      input.audit,
    ),
  };
}
