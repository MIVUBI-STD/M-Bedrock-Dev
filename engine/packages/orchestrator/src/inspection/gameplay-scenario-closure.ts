import type {
  GameplayScenarioClosure,
  GameplayScenarioGraph,
} from "./gameplay-scenario-model.js";

export function assessGameplayScenarioClosure(
  graph: GameplayScenarioGraph,
): GameplayScenarioClosure {
  const orphanComponentIds = graph.components
    .filter((component) => component.orphan)
    .map((component) => component.id)
    .sort();

  const missingPurposeComponentIds = graph.components
    .filter((component) => !component.gameplayPurpose.trim())
    .map((component) => component.id)
    .sort();

  const runtimeBlockedCausalLinkIds = graph.causalLinks
    .filter((edge) => edge.status === "RUNTIME_BLOCKED")
    .map((edge) => edge.id)
    .sort();

  const detectionGapCausalLinkIds = graph.causalLinks
    .filter((edge) => edge.status === "DETECTION_GAP")
    .map((edge) => edge.id)
    .sort();

  const unresolvedCausalLinkIds = graph.causalLinks
    .filter(
      (edge) =>
        edge.status === "RUNTIME_BLOCKED" ||
        edge.status === "DETECTION_GAP",
    )
    .map((edge) => edge.id)
    .sort();

  const scenarioWithoutComponents = graph.scenarios
    .filter((scenario) => scenario.componentIds.length === 0)
    .map((scenario) => scenario.id)
    .sort();

  const reasons: string[] = [];
  if (graph.scenarios.length === 0) {
    reasons.push("No material gameplay scenarios were compiled.");
  }
  if (orphanComponentIds.length > 0) {
    reasons.push(
      "Gameplay/technical components exist without a scenario correlation: " +
      orphanComponentIds.join(", ") + ".",
    );
  }
  if (missingPurposeComponentIds.length > 0) {
    reasons.push(
      "Components are missing a gameplay purpose: " +
      missingPurposeComponentIds.join(", ") + ".",
    );
  }
  if (detectionGapCausalLinkIds.length > 0) {
    reasons.push(
      "Causal gameplay links remain unproven and require detection work: " +
      detectionGapCausalLinkIds.join(", ") + ".",
    );
  }
  if (scenarioWithoutComponents.length > 0) {
    reasons.push(
      "Scenario variants are present without concrete selected-artifact component bindings: " +
      scenarioWithoutComponents.join(", ") + ".",
    );
  }
  if (runtimeBlockedCausalLinkIds.length > 0) {
    reasons.push(
      "Some causal links require irreducible Minecraft runtime proof.",
    );
  }

  const status =
    graph.scenarios.length === 0 ||
    orphanComponentIds.length > 0 ||
    missingPurposeComponentIds.length > 0 ||
    detectionGapCausalLinkIds.length > 0 ||
    scenarioWithoutComponents.length > 0
      ? "OPEN" as const
      : runtimeBlockedCausalLinkIds.length > 0
        ? "PARTIAL" as const
        : "CLOSED" as const;

  if (status === "CLOSED") {
    reasons.push(
      "Every compiled gameplay component has a gameplay purpose and scenario correlation, and every causal link is resolved.",
    );
  }

  return {
    status,
    orphanComponentIds,
    missingPurposeComponentIds,
    unresolvedCausalLinkIds,
    runtimeBlockedCausalLinkIds,
    detectionGapCausalLinkIds,
    reasons,
  };
}
