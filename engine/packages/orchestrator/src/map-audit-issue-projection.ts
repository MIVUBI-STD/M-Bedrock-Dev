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
  readonly gameplayFlow: GameplayIssueFlowStage;
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

function reportIssueTypeFor(
  scenarioLabel: string,
  subjectIds: readonly string[],
  componentIds: readonly string[],
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[],
): GameplayReportIssueType {
  const related = capabilityDelivery.filter(
    (item) =>
      item.status === "DEGRADED" ||
      item.status === "MISSING",
  ).filter(
    (item) =>
      subjectIds.includes(item.subjectId) ||
      componentIds.includes(item.subjectId) ||
      (
        item.subjectId ===
          "runtime:arena-capacity" &&
        scenarioLabel ===
          "arena-capacity-plus-one"
      ),
  );

  return related.some(
    (item) =>
      item.reportIssueType ===
      "DESIGN_MISMATCH",
  )
    ? "DESIGN_MISMATCH"
    : "BUG";
}

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
        gameplayFlow:
          classification.gameplayFlow,
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
      a.causalLinkId.localeCompare(b.causalLinkId)
    );
}
