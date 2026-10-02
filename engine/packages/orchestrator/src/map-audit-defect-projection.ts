import type {
  GameplayScenarioGraph,
} from "./inspection/gameplay-scenario-model.js";
import type {
  GameplayDefectResolutionGate,
} from "./inspection/gameplay-defect-resolution.js";

export interface ReadyAuditDefectProjection {
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

function nonEmpty(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function projectReadyAuditDefects(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
): readonly ReadyAuditDefectProjection[] {
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
      return {
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
          ...link.subjectIds,
          ...(resolution.subjectIds ?? []),
        ])].sort(),
        componentIds: [...new Set([
          ...link.componentIds,
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
      };
    })
    .sort((a, b) =>
      a.causalLinkId.localeCompare(b.causalLinkId)
    );
}
