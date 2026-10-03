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

export interface ReadyAuditIssueProjection {
  readonly reportIssueType: GameplayReportIssueType;
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

function reportIssueTypeFor(
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
      item.reportIssueType ===
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

export function projectReadyAuditIssues(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[] = [],
): readonly ReadyAuditIssueProjection[] {
  const ready = new Set(gate.confirmedDefectReadyIds);

  return gate.resolutions
    .filter((resolution) =>
      ready.has(resolution.causalLinkId) &&
      nonEmpty(resolution.scenarioId) &&
      nonEmpty(resolution.gameplayTrigger) &&
      nonEmpty(resolution.gameplayConsequence) &&
      nonEmpty(resolution.expectedOutcome) &&
      nonEmpty(resolution.actualOutcome) &&
      nonEmpty(resolution.affectedScope)
    )
    .map((resolution) => {
      const scenario = graph.scenarios.find(
        (item) => item.id === resolution.scenarioId,
      );
      const link = graph.causalLinks.find(
        (item) => item.id === resolution.causalLinkId,
      );
      if (scenario === undefined || link === undefined) {
        throw new Error(
          "CONFIRMED_DEFECT_READY resolution lost its scenario/causal-link owner: " +
            resolution.causalLinkId +
            ".",
        );
      }
      const subjectIds = [...new Set([
        ...link.subjectIds,
        ...(resolution.subjectIds ?? []),
      ])].sort();
      const componentIds = [...new Set([
        ...link.componentIds,
        ...(resolution.componentIds ?? []),
      ])].sort();
      const knowledgeDomain =
        link.knowledgeRequirementId === undefined
          ? undefined
          : graph.knowledgeRequirements.find(
              (item) =>
                item.id ===
                link.knowledgeRequirementId,
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
            (item) =>
              item.playerFacingEvidenceIds,
          ),
        ),
      ].sort();
      const informationMismatch =
        relatedDelivery.some(
          (item) => item.informationMismatch,
        );
      const classification =
        classifyGameplayIssue({
          gameplayStage:
            scenario.gameplayStage,
          scenarioLabel:
            scenario.label,
          componentIds,
          ...(knowledgeDomain === undefined
            ? {}
            : { knowledgeDomain }),
        });
      return {
        reportIssueType: reportIssueTypeFor(
          scenario.label,
          subjectIds,
          componentIds,
          capabilityDelivery,
        ),
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
        subjectIds,
        componentIds,
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
      };
    })
    .sort((a, b) =>
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
