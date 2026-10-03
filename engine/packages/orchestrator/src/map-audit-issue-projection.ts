import type {
  GameplayScenarioGraph,
} from "./inspection/gameplay-scenario-model.js";
import type {
  GameplayDefectResolutionGate,
} from "./inspection/gameplay-defect-resolution.js";
import {
  classifyGameplayIssue,
  type GameplayCapabilityDeliveryAssessment,
  type GameplayReportIssueType,
  type GameplayIssueFailureDomain,
  type GameplayIssueFlowStage,
} from "../../diagnostic-reasoning/src/index.js";

export type AuditIssueStatus =
  | "PROVEN"
  | "NEED_VALIDATION";

interface AuditIssueProjectionBase {
  readonly status: AuditIssueStatus;
  readonly issueType: GameplayReportIssueType;
  readonly failureDomain: GameplayIssueFailureDomain;
  readonly contributingDomains:
    readonly GameplayIssueFailureDomain[];
  readonly gameplayFlow: GameplayIssueFlowStage;
  readonly informationMismatch: boolean;
  readonly playerFacingEvidenceIds: readonly string[];
  readonly causalLinkId: string;
  readonly scenarioId: string;
  readonly gameplayStage: string;
  readonly scenarioLabel: string;
  readonly gameplayTrigger: string;
  readonly gameplayConsequence: string;
  readonly expectedOutcome: string;
  readonly actualOutcome: string;
  readonly affectedScope: string;
  readonly subjectIds: readonly string[];
  readonly componentIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly knowledgeRequirementId?: string;
}

export interface ReadyAuditIssueProjection
  extends AuditIssueProjectionBase {
  readonly status: "PROVEN";
}

export interface NeedValidationAuditIssueProjection
  extends AuditIssueProjectionBase {
  readonly status: "NEED_VALIDATION";
  readonly validationReason: string;
  readonly missingProof: string;
  readonly validationTest: string;
  /**
   * Stable consolidation key. Multiple unresolved findings with the same key
   * should be exercised by one targeted test rather than repeated manually.
   */
  readonly validationGroupKey: string;
}

export type AuditIssueProjection =
  | ReadyAuditIssueProjection
  | NeedValidationAuditIssueProjection;

function relatedCapabilityDelivery(
  scenarioLabel: string,
  subjectIds: readonly string[],
  componentIds: readonly string[],
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[],
): readonly GameplayCapabilityDeliveryAssessment[] {
  return capabilityDelivery.filter(
    (item) =>
      (
        item.status === "DEGRADED" ||
        item.status === "MISSING"
      ) &&
      (
        subjectIds.includes(item.subjectId) ||
        componentIds.includes(item.subjectId) ||
        (
          item.subjectId ===
            "runtime:arena-capacity" &&
          scenarioLabel ===
            "arena-capacity-plus-one"
        )
      ),
  );
}

function issueTypeFor(
  scenarioLabel: string,
  subjectIds: readonly string[],
  componentIds: readonly string[],
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[],
): GameplayReportIssueType {
  const related = relatedCapabilityDelivery(
    scenarioLabel,
    subjectIds,
    componentIds,
    capabilityDelivery,
  );

  return related.some(
    (item) =>
      item.issueType ===
      "DESIGN_MISMATCH",
  )
    ? "DESIGN_MISMATCH"
    : "BUG";
}

const GAMEPLAY_FLOW_ORDER: Readonly<
  Record<GameplayIssueFlowStage, number>
> = {
  ENTRY_JOIN: 0,
  READY_START: 1,
  SETUP: 2,
  ACTIVE_GAMEPLAY: 3,
  PROGRESSION: 4,
  TERMINAL: 5,
  CLEANUP_REPLAY: 6,
  RECOVERY: 7,
};

function nonEmpty(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function projectionContext(
  graph: GameplayScenarioGraph,
  causalLinkId: string,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[],
) {
  const link = graph.causalLinks.find(
    (item) => item.id === causalLinkId,
  );
  if (link === undefined) return undefined;
  const scenario = graph.scenarios.find(
    (item) => item.id === link.scenarioId,
  );
  if (scenario === undefined) return undefined;

  const subjectIds = [...new Set(link.subjectIds)].sort();
  const componentIds = [...new Set(link.componentIds)].sort();
  const knowledgeDomain =
    link.knowledgeRequirementId === undefined
      ? undefined
      : graph.knowledgeRequirements.find(
          (item) =>
            item.id === link.knowledgeRequirementId,
        )?.domain;
  const relatedDelivery =
    relatedCapabilityDelivery(
      scenario.label,
      subjectIds,
      componentIds,
      capabilityDelivery,
    );
  const playerFacingEvidenceIds = [
    ...new Set(
      relatedDelivery.flatMap(
        (item) => item.playerFacingEvidenceIds,
      ),
    ),
  ].sort();
  const classification =
    classifyGameplayIssue({
      gameplayStage: scenario.gameplayStage,
      scenarioLabel: scenario.label,
      componentIds,
      ...(knowledgeDomain === undefined
        ? {}
        : { knowledgeDomain }),
    });

  return {
    link,
    scenario,
    subjectIds,
    componentIds,
    knowledgeDomain,
    playerFacingEvidenceIds,
    informationMismatch:
      relatedDelivery.some(
        (item) => item.informationMismatch,
      ),
    classification,
    issueType: issueTypeFor(
      scenario.label,
      subjectIds,
      componentIds,
      capabilityDelivery,
    ),
  };
}

function sortIssues<T extends AuditIssueProjection>(
  issues: readonly T[],
): readonly T[] {
  return [...issues].sort((a, b) =>
    GAMEPLAY_FLOW_ORDER[a.gameplayFlow] -
      GAMEPLAY_FLOW_ORDER[b.gameplayFlow] ||
    a.failureDomain.localeCompare(
      b.failureDomain,
    ) ||
    a.causalLinkId.localeCompare(
      b.causalLinkId,
    )
  );
}

export function projectReadyAuditIssues(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[] = [],
): readonly ReadyAuditIssueProjection[] {
  const ready = new Set(gate.confirmedDefectReadyIds);

  return sortIssues(
    gate.resolutions
      .filter((resolution) =>
        ready.has(resolution.causalLinkId) &&
        nonEmpty(resolution.scenarioId) &&
        nonEmpty(resolution.gameplayTrigger) &&
        nonEmpty(resolution.gameplayConsequence) &&
        nonEmpty(resolution.expectedOutcome) &&
        nonEmpty(resolution.actualOutcome) &&
        nonEmpty(resolution.affectedScope)
      )
      .flatMap((resolution) => {
        const context = projectionContext(
          graph,
          resolution.causalLinkId,
          capabilityDelivery,
        );
        if (context === undefined) {
          throw new Error(
            "CONFIRMED_DEFECT_READY resolution lost its scenario/causal-link owner: " +
              resolution.causalLinkId +
              ".",
          );
        }
        const {
          link,
          scenario,
          subjectIds,
          componentIds,
          playerFacingEvidenceIds,
          informationMismatch,
          classification,
          issueType,
        } = context;
        return [{
          status: "PROVEN" as const,
          issueType,
          failureDomain:
            classification.failureDomain,
          contributingDomains:
            classification.contributingDomains,
          gameplayFlow:
            classification.gameplayFlow,
          informationMismatch,
          playerFacingEvidenceIds,
          causalLinkId: resolution.causalLinkId,
          scenarioId: scenario.id,
          gameplayStage: scenario.gameplayStage,
          scenarioLabel: scenario.label,
          gameplayTrigger: resolution.gameplayTrigger!,
          gameplayConsequence: resolution.gameplayConsequence!,
          expectedOutcome: resolution.expectedOutcome!,
          actualOutcome: resolution.actualOutcome!,
          affectedScope: resolution.affectedScope!,
          subjectIds: [...new Set([
            ...subjectIds,
            ...(resolution.subjectIds ?? []),
          ])].sort(),
          componentIds: [...new Set([
            ...componentIds,
            ...(resolution.componentIds ?? []),
          ])].sort(),
          evidenceIds: [...new Set([
            ...link.evidenceIds,
            ...(resolution.evidenceIds ?? []),
          ])].sort(),
          ...(resolution.knowledgeRequirementId === undefined
            ? {}
            : {
                knowledgeRequirementId:
                  resolution.knowledgeRequirementId,
              }),
        }];
      }),
  );
}

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
