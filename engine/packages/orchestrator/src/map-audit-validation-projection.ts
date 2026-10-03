import type {
  GameplayScenarioGraph,
} from "./inspection/gameplay-scenario-model.js";
import type {
  GameplayDefectResolutionGate,
} from "./inspection/gameplay-defect-resolution.js";
import type {
  GameplayModelClosureResult,
} from "../../gameplay-intent/src/index.js";
import {
  classifyGameplayIssue,
  type GameplayCapabilityDeliveryAssessment,
  type GameplayReportIssueType,
  type GameplayIssueFailureDomain,
  type GameplayIssueFlowStage,
  type NegativeSpaceSignal,
  type TemporalInteractionRisk,
} from "../../diagnostic-reasoning/src/index.js";
import {
  issueTypeFor,
  projectionContext,
  projectReadyAuditIssues,
  relatedCapabilityDelivery,
  sortIssues,
  type AuditIssueProjection,
  type NeedValidationAuditIssueProjection,
} from "./map-audit-issue-projection.js";

export function projectNeedValidationAuditIssues(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[] = [],
): readonly NeedValidationAuditIssueProjection[] {
  const disproved = new Set(
    gate.blockingCounterProofIds,
  );
  const proven = new Set(
    gate.confirmedDefectReadyIds,
  );
  const translationRequired = new Set(
    gate.gameplayTranslationRequiredIds,
  );

  return sortIssues(
    graph.causalLinks.flatMap((link) => {
      if (
        disproved.has(link.id) ||
        proven.has(link.id)
      ) {
        return [];
      }

      const isRuntime =
        link.status === "RUNTIME_BLOCKED";
      const isGap =
        link.status === "DETECTION_GAP";
      const needsTranslation =
        translationRequired.has(link.id);

      if (
        !isRuntime &&
        !isGap &&
        !needsTranslation
      ) {
        return [];
      }

      const context = projectionContext(
        graph,
        link.id,
        capabilityDelivery,
      );
      if (context === undefined) return [];

      const {
        scenario,
        subjectIds,
        componentIds,
        playerFacingEvidenceIds,
        informationMismatch,
        classification,
        issueType,
      } = context;

      const validationReason =
        needsTranslation
          ? "A source contradiction exists, but the player-facing defect contract is not complete enough for final confirmation."
          : isRuntime
            ? "The dependency cannot be decided safely from static/package evidence and requires one runtime observation."
            : "The selected artifact exposes an unresolved semantic/detection gap for this gameplay dependency.";

      const missingProof =
        needsTranslation
          ? "Complete gameplay trigger, expected/actual behavior, player consequence, and affected scope."
          : isRuntime
            ? "Observed runtime outcome for the unresolved dependency."
            : "Evidence that resolves the unsupported or semantically unknown dependency.";

      const validationTest =
        "Exercise scenario '" +
        scenario.label +
        "' and directly verify: " +
        link.purpose +
        ". Treat any observed violation as the deciding evidence for promotion to PROVEN.";

      return [{
        status: "NEED_VALIDATION" as const,
        issueType,
        failureDomain:
          classification.failureDomain,
        contributingDomains:
          classification.contributingDomains,
        gameplayFlow:
          classification.gameplayFlow,
        informationMismatch,
        playerFacingEvidenceIds,
        causalLinkId: link.id,
        scenarioId: scenario.id,
        gameplayStage: scenario.gameplayStage,
        scenarioLabel: scenario.label,
        gameplayTrigger: scenario.purpose,
        gameplayConsequence:
          "Potential player-visible failure remains unresolved for this required gameplay dependency.",
        expectedOutcome: link.purpose,
        actualOutcome: link.reason,
        affectedScope:
          [...new Set([
            ...subjectIds,
            ...componentIds,
          ])].sort().join(", "),
        subjectIds,
        componentIds,
        evidenceIds: [...new Set(link.evidenceIds)].sort(),
        ...(link.knowledgeRequirementId === undefined
          ? {}
          : {
              knowledgeRequirementId:
                link.knowledgeRequirementId,
            }),
        validationReason,
        missingProof,
        validationTest,
        validationGroupKey:
          scenario.id +
          ":" +
          (
            link.knowledgeRequirementId ??
            classification.failureDomain
          ),
      }];
    }),
  );
}

function syntheticNeedValidationFromKnowledge(
  graph: GameplayScenarioGraph,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[],
): readonly NeedValidationAuditIssueProjection[] {
  const causalKnowledgeIds = new Set(
    graph.causalLinks
      .map((link) => link.knowledgeRequirementId)
      .filter((id): id is string => id !== undefined),
  );

  return graph.knowledgeReceipts.flatMap((receipt) => {
    if (
      receipt.status === "SATISFIED" ||
      causalKnowledgeIds.has(receipt.requirementId)
    ) {
      return [];
    }

    const requirement = graph.knowledgeRequirements.find(
      (item) => item.id === receipt.requirementId,
    );
    const scenario = graph.scenarios.find(
      (item) => item.id === receipt.scenarioId,
    );
    if (requirement === undefined || scenario === undefined) {
      return [];
    }

    const componentIds = [...new Set([
      ...requirement.componentIds,
      ...receipt.componentIds,
    ])].sort();
    const subjectIds = [...new Set([
      ...requirement.subjectIds,
      ...receipt.subjectIds,
    ])].sort();
    const relatedDelivery = relatedCapabilityDelivery(
      scenario.label,
      subjectIds,
      componentIds,
      capabilityDelivery,
    );
    const classification = classifyGameplayIssue({
      gameplayStage: scenario.gameplayStage,
      scenarioLabel: scenario.label,
      componentIds,
      knowledgeDomain: requirement.domain,
    });

    const statusReason =
      receipt.status === "CAPABILITY_GAP"
        ? "No registered analysis capability can currently prove this required gameplay knowledge."
        : receipt.status === "BLOCKED_BY_PREREQUISITE"
          ? "The required gameplay proof is blocked by an unresolved prerequisite knowledge node."
          : "The required analysis capability exists, but it did not return sufficient scenario-scoped evidence.";

    return [{
      status: "NEED_VALIDATION" as const,
      issueType: issueTypeFor(
        scenario.label,
        subjectIds,
        componentIds,
        capabilityDelivery,
      ),
      failureDomain: classification.failureDomain,
      contributingDomains:
        classification.contributingDomains,
      gameplayFlow: classification.gameplayFlow,
      informationMismatch:
        relatedDelivery.some(
          (item) => item.informationMismatch,
        ),
      playerFacingEvidenceIds: [
        ...new Set(
          relatedDelivery.flatMap(
            (item) => item.playerFacingEvidenceIds,
          ),
        ),
      ].sort(),
      causalLinkId:
        "knowledge-gap:" + receipt.requirementId,
      scenarioId: scenario.id,
      gameplayStage: scenario.gameplayStage,
      scenarioLabel: scenario.label,
      gameplayTrigger: scenario.purpose,
      gameplayConsequence:
        "A required gameplay dependency remains materially unproven because its supporting knowledge could not be closed.",
      expectedOutcome:
        requirement.reason,
      actualOutcome:
        receipt.reason,
      affectedScope:
        [...new Set([
          ...subjectIds,
          ...componentIds,
        ])].sort().join(", "),
      subjectIds,
      componentIds,
      evidenceIds: [...new Set(receipt.evidenceIds)].sort(),
      knowledgeRequirementId:
        receipt.requirementId,
      validationReason: statusReason,
      missingProof:
        "Scenario-scoped " +
        requirement.domain +
        " evidence sufficient to decide the required gameplay dependency.",
      validationTest:
        "Exercise scenario '" +
        scenario.label +
        "' and directly verify the " +
        requirement.domain +
        " dependency: " +
        requirement.reason,
      validationGroupKey:
        scenario.id + ":" + requirement.domain,
    }];
  });
}

function syntheticNeedValidationFromShallowScenarios(
  graph: GameplayScenarioGraph,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[],
): readonly NeedValidationAuditIssueProjection[] {
  return graph.scenarios.flatMap((scenario) => {
    if (
      scenario.composedScenarioIds.length > 0 ||
      scenario.componentIds.length === 0 ||
      scenario.causalLinkIds.length > 0
    ) {
      return [];
    }

    const componentIds = [...new Set(scenario.componentIds)].sort();
    const subjectIds = [...new Set(scenario.sourceSubjectIds)].sort();
    const relatedDelivery = relatedCapabilityDelivery(
      scenario.label,
      subjectIds,
      componentIds,
      capabilityDelivery,
    );
    const classification = classifyGameplayIssue({
      gameplayStage: scenario.gameplayStage,
      scenarioLabel: scenario.label,
      componentIds,
    });

    return [{
      status: "NEED_VALIDATION" as const,
      issueType: issueTypeFor(
        scenario.label,
        subjectIds,
        componentIds,
        capabilityDelivery,
      ),
      failureDomain: classification.failureDomain,
      contributingDomains:
        classification.contributingDomains,
      gameplayFlow: classification.gameplayFlow,
      informationMismatch:
        relatedDelivery.some(
          (item) => item.informationMismatch,
        ),
      playerFacingEvidenceIds: [
        ...new Set(
          relatedDelivery.flatMap(
            (item) => item.playerFacingEvidenceIds,
          ),
        ),
      ].sort(),
      causalLinkId:
        "shallow-scenario:" + scenario.id,
      scenarioId: scenario.id,
      gameplayStage: scenario.gameplayStage,
      scenarioLabel: scenario.label,
      gameplayTrigger: scenario.purpose,
      gameplayConsequence:
        "The gameplay scenario exists but has no causal proof edge, so a material failure could remain invisible to the audit.",
      expectedOutcome:
        "Every material leaf gameplay scenario has at least one causal dependency proof.",
      actualOutcome:
        "No causal proof edge was compiled for this scenario.",
      affectedScope:
        [...new Set([
          ...subjectIds,
          ...componentIds,
        ])].sort().join(", "),
      subjectIds,
      componentIds,
      evidenceIds: [],
      validationReason:
        "Scenario coverage is structurally too shallow to claim the behavior was actually tested.",
      missingProof:
        "At least one scenario-scoped causal dependency and its deciding evidence.",
      validationTest:
        "Run scenario '" +
        scenario.label +
        "' through its success and failure exit and verify that every required transition is causally accounted.",
      validationGroupKey:
        scenario.id + ":scenario-closure",
    }];
  });
}

export function projectAllNeedValidationAuditIssues(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[] = [],
): readonly NeedValidationAuditIssueProjection[] {
  const items = [
    ...projectNeedValidationAuditIssues(
      graph,
      gate,
      capabilityDelivery,
    ),
    ...syntheticNeedValidationFromKnowledge(
      graph,
      capabilityDelivery,
    ),
    ...syntheticNeedValidationFromShallowScenarios(
      graph,
      capabilityDelivery,
    ),
  ];

  const byId = new Map<string, NeedValidationAuditIssueProjection>();
  for (const item of items) {
    if (!byId.has(item.causalLinkId)) {
      byId.set(item.causalLinkId, item);
    }
  }
  return sortIssues([...byId.values()]);
}

export function projectSignalNeedValidationAuditIssues(
  negativeSpace: readonly NegativeSpaceSignal[],
  temporalRisks: readonly TemporalInteractionRisk[],
): readonly NeedValidationAuditIssueProjection[] {
  const negative = negativeSpace.map((signal) => {
    const flow: GameplayIssueFlowStage =
      signal.kind === "reset-without-baseline"
        ? "CLEANUP_REPLAY"
        : signal.kind === "entry-without-exit"
          ? "PROGRESSION"
          : "ACTIVE_GAMEPLAY";
    const failureDomain: GameplayIssueFailureDomain =
      signal.kind === "reset-without-baseline"
        ? "persistence-recovery"
        : "state-ownership";

    return {
      status: "NEED_VALIDATION" as const,
      issueType: "BUG" as const,
      failureDomain,
      contributingDomains: [failureDomain],
      gameplayFlow: flow,
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId: signal.id,
      scenarioId: "signal:" + signal.subjectId,
      gameplayStage: flow,
      scenarioLabel: signal.kind,
      gameplayTrigger:
        "Exercise gameplay that reads, writes, enters, exits, or resets " +
        signal.subjectId +
        ".",
      gameplayConsequence:
        "A missing lifecycle counterpart can leave gameplay state incomplete, stale, or permanently blocked.",
      expectedOutcome:
        "Every material lifecycle/state operation has the required consuming, exit, reset, or effect path.",
      actualOutcome: signal.reason,
      affectedScope: signal.subjectId,
      subjectIds: [signal.subjectId],
      componentIds: [],
      evidenceIds: [...signal.evidenceIds],
      validationReason:
        "Negative-space analysis found a materially asymmetric gameplay lifecycle, but the player-visible consequence still needs direct causal confirmation.",
      missingProof:
        "A scenario-scoped proof that the missing counterpart is truly required and reachable for player-visible gameplay.",
      validationTest:
        "Trigger the gameplay path for " +
        signal.subjectId +
        " and verify the missing counterpart implied by " +
        signal.kind +
        ". Fail if state cannot progress, reset, or return to baseline as required.",
      validationGroupKey:
        "negative-space:" +
        signal.subjectId,
    } satisfies NeedValidationAuditIssueProjection;
  });

  const temporal = temporalRisks
    .filter((risk) => risk.priority === "high")
    .map((risk) => ({
      status: "NEED_VALIDATION" as const,
      issueType: "BUG" as const,
      failureDomain: "temporal-async" as const,
      contributingDomains: [
        "temporal-async" as const,
      ],
      gameplayFlow: "RECOVERY" as const,
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId:
        "temporal-risk:" +
        risk.leftSystem +
        ":" +
        risk.rightSystem,
      scenarioId:
        "temporal:" +
        risk.leftSystem +
        ":" +
        risk.rightSystem,
      gameplayStage: "RECOVERY",
      scenarioLabel: "temporal-interaction",
      gameplayTrigger:
        "Exercise " +
        risk.leftSystem +
        " and " +
        risk.rightSystem +
        " across before/overlap/after timing windows.",
      gameplayConsequence:
        "A delayed or shared mutation may commit after ownership, phase, player, or arena state has changed.",
      expectedOutcome:
        "Temporal work is cancelled or revalidated before it can mutate stale gameplay state.",
      actualOutcome:
        "High-risk timing factors are present: " +
        risk.factors.join(", ") +
        ".",
      affectedScope:
        risk.leftSystem +
        " ↔ " +
        risk.rightSystem,
      subjectIds: [
        risk.leftSystem,
        risk.rightSystem,
      ].sort(),
      componentIds: [],
      evidenceIds: [],
      validationReason:
        "Temporal analysis found a high-risk interaction whose exact commit ordering is not yet causally proven.",
      missingProof:
        "Whether stale or overlapping work can actually commit after the relevant ownership/state transition.",
      validationTest:
        "Run " +
        risk.leftSystem +
        " and " +
        risk.rightSystem +
        " in before, overlap, and after timing windows; fail if old work mutates the new/terminal state.",
      validationGroupKey:
        "temporal:" +
        [risk.leftSystem, risk.rightSystem]
          .sort()
          .join(":"),
    } satisfies NeedValidationAuditIssueProjection));

  return sortIssues([
    ...negative,
    ...temporal,
  ]);
}

export function projectClosureNeedValidationAuditIssues(
  closure: GameplayModelClosureResult,
): readonly NeedValidationAuditIssueProjection[] {
  const findings: NeedValidationAuditIssueProjection[] = [];

  for (const surface of closure.surfaces) {
    if (
      !surface.material ||
      (
        surface.status !== "unknown" &&
        surface.status !== "blocked"
      )
    ) {
      continue;
    }

    const isBoundary =
      surface.id.includes("capacity") ||
      (surface.boundaries?.length ?? 0) > 0;
    const flow: GameplayIssueFlowStage =
      isBoundary
        ? "READY_START"
        : surface.kind === "lifecycle"
          ? "RECOVERY"
          : surface.kind === "outcome"
            ? "TERMINAL"
            : surface.kind === "objective" ||
                surface.kind === "phase"
              ? "PROGRESSION"
              : "ACTIVE_GAMEPLAY";
    const failureDomain: GameplayIssueFailureDomain =
      surface.id.includes("arena")
        ? "arena-multi-arena"
        : surface.id.includes("inventory")
          ? "inventory-economy"
          : surface.id.includes("chunk")
            ? "chunk-simulation"
            : surface.id.includes("persist")
              ? "persistence-recovery"
              : isBoundary
                ? "boundary-capacity"
                : "state-ownership";

    findings.push({
      status: "NEED_VALIDATION",
      issueType: "BUG",
      failureDomain,
      contributingDomains: [failureDomain],
      gameplayFlow: flow,
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId:
        "closure-surface:" + surface.id,
      scenarioId:
        "closure:" + surface.id,
      gameplayStage: flow,
      scenarioLabel: surface.label,
      gameplayTrigger:
        "Exercise the gameplay path that depends on " +
        surface.label +
        ".",
      gameplayConsequence:
        "A material gameplay surface remains unresolved, so defects inside this surface cannot yet be excluded.",
      expectedOutcome:
        "Material gameplay surface is understood well enough to prove or disprove its required behavior.",
      actualOutcome:
        surface.reason ??
        "Material gameplay surface remains unresolved.",
      affectedScope: surface.id,
      subjectIds: [surface.id],
      componentIds: [],
      evidenceIds: [
        ...new Set(
          surface.evidenceIds ?? [],
        ),
      ].sort(),
      validationReason:
        "Gameplay Model Closure marks this material surface as " +
        surface.status +
        ".",
      missingProof:
        "Decisive selected-artifact evidence for " +
        surface.label +
        ".",
      validationTest:
        "Exercise " +
        surface.label +
        " through its normal and failure/recovery path and verify the unresolved behavior described by the closure reason.",
      validationGroupKey:
        "closure-surface:" + surface.id,
    });
  }

  for (const id of closure.unaccountedSurfaceIds) {
    findings.push({
      status: "NEED_VALIDATION",
      issueType: "BUG",
      failureDomain: "state-ownership",
      contributingDomains: [
        "state-ownership",
      ],
      gameplayFlow: "ACTIVE_GAMEPLAY",
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId:
        "unaccounted-surface:" + id,
      scenarioId:
        "unaccounted:" + id,
      gameplayStage: "ACTIVE_GAMEPLAY",
      scenarioLabel: "unaccounted-gameplay-surface",
      gameplayTrigger:
        "Locate and exercise the discovered gameplay surface " +
        id +
        ".",
      gameplayConsequence:
        "A discovered gameplay surface is absent from the closed gameplay model, so any defect in it could be missed entirely.",
      expectedOutcome:
        "Every discovered material surface has an explicit semantic owner and audit disposition.",
      actualOutcome:
        "The discovered surface is not accounted in Gameplay Model Closure.",
      affectedScope: id,
      subjectIds: [id],
      componentIds: [],
      evidenceIds: [],
      validationReason:
        "Discovered gameplay surface is unaccounted.",
      missingProof:
        "Semantic ownership, gameplay purpose, dependencies, and proof path for " +
        id +
        ".",
      validationTest:
        "Trace " +
        id +
        " from player trigger to state mutation and exit, then verify its success/failure behavior.",
      validationGroupKey:
        "unaccounted-surface:" + id,
    });
  }

  if (!closure.stateModelComplete) {
    findings.push({
      status: "NEED_VALIDATION",
      issueType: "BUG",
      failureDomain: "state-ownership",
      contributingDomains: [
        "state-ownership",
      ],
      gameplayFlow: "ACTIVE_GAMEPLAY",
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId:
        "closure-gap:state-model",
      scenarioId:
        "closure:state-model",
      gameplayStage: "ACTIVE_GAMEPLAY",
      scenarioLabel: "state-model-closure",
      gameplayTrigger:
        "Exercise major gameplay state transitions across success, failure, retry, cleanup, and recovery.",
      gameplayConsequence:
        "Incomplete state modeling can hide stale-state, ownership, reset, and progression defects.",
      expectedOutcome:
        "All material states have create/read/write/clear ownership and lifecycle semantics.",
      actualOutcome:
        "Gameplay Model Closure reports stateModelComplete=false.",
      affectedScope: "gameplay-state-model",
      subjectIds: [],
      componentIds: [],
      evidenceIds: [],
      validationReason:
        "Major gameplay state/transition model is incomplete.",
      missingProof:
        "Complete state ownership and lifecycle coverage.",
      validationTest:
        "Trace every major state transition through success, failure, retry, cleanup, reconnect, and second-run paths; fail any transition with unowned or uncleared material state.",
      validationGroupKey:
        "closure:state-model",
    });
  }

  if (!closure.boundariesExtracted) {
    findings.push({
      status: "NEED_VALIDATION",
      issueType: "BUG",
      failureDomain: "boundary-capacity",
      contributingDomains: [
        "boundary-capacity",
      ],
      gameplayFlow: "READY_START",
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId:
        "closure-gap:boundaries",
      scenarioId:
        "closure:boundaries",
      gameplayStage: "READY_START",
      scenarioLabel: "boundary-closure",
      gameplayTrigger:
        "Exercise material gameplay limits at first/minimum, maximum, and maximum+1 where applicable.",
      gameplayConsequence:
        "Unknown boundaries can hide capacity, final-wave, retry-limit, threshold, and off-by-one defects.",
      expectedOutcome:
        "Every material numeric/discrete gameplay limit has explicit below/at/above semantics.",
      actualOutcome:
        "Gameplay Model Closure reports boundariesExtracted=false.",
      affectedScope: "gameplay-boundaries",
      subjectIds: [],
      componentIds: [],
      evidenceIds: [],
      validationReason:
        "Material gameplay boundaries are not fully extracted.",
      missingProof:
        "Complete boundary registry and edge-case behavior.",
      validationTest:
        "Test each unresolved material boundary at N-1, N, and N+1 (or first/final equivalents) and verify the expected transition.",
      validationGroupKey:
        "closure:boundaries",
    });
  }

  const byId = new Map<string, NeedValidationAuditIssueProjection>();
  for (const item of findings) {
    if (!byId.has(item.causalLinkId)) {
      byId.set(item.causalLinkId, item);
    }
  }
  return sortIssues([...byId.values()]);
}

export interface AuditValidationTestGroup {
  readonly key: string;
  readonly findingIds: readonly string[];
  readonly issueTypes: readonly GameplayReportIssueType[];
  readonly gameplayFlows: readonly GameplayIssueFlowStage[];
  readonly test: string;
  readonly missingProof: readonly string[];
}

export function groupNeedValidationTests(
  findings: readonly NeedValidationAuditIssueProjection[],
): readonly AuditValidationTestGroup[] {
  const groups = new Map<
    string,
    NeedValidationAuditIssueProjection[]
  >();

  for (const finding of findings) {
    const current =
      groups.get(finding.validationGroupKey) ?? [];
    current.push(finding);
    groups.set(
      finding.validationGroupKey,
      current,
    );
  }

  return [...groups.entries()]
    .map(([key, items]) => ({
      key,
      findingIds: [
        ...new Set(
          items.map((item) => item.causalLinkId),
        ),
      ].sort(),
      issueTypes: [
        ...new Set(
          items.map((item) => item.issueType),
        ),
      ].sort(),
      gameplayFlows: [
        ...new Set(
          items.map((item) => item.gameplayFlow),
        ),
      ].sort(),
      test:
        items.length === 1
          ? items[0]!.validationTest
          : "Run one consolidated scenario for " +
            key +
            " and verify all unresolved dependencies covered by findings: " +
            items
              .map((item) => item.causalLinkId)
              .sort()
              .join(", ") +
            ".",
      missingProof: [
        ...new Set(
          items.map((item) => item.missingProof),
        ),
      ].sort(),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function projectAllAuditIssues(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[] = [],
): readonly AuditIssueProjection[] {
  return sortIssues([
    ...projectReadyAuditIssues(
      graph,
      gate,
      capabilityDelivery,
    ),
    ...projectAllNeedValidationAuditIssues(
      graph,
      gate,
      capabilityDelivery,
    ),
  ]);
}
