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

  const missingRequiredKnowledgeIds =
    graph.knowledgeReceipts
      .filter(
        (receipt) =>
          receipt.status ===
          "MISSING_REQUIRED_KNOWLEDGE",
      )
      .map((receipt) => receipt.requirementId)
      .sort();

  const prerequisiteBlockedKnowledgeIds =
    graph.knowledgeReceipts
      .filter(
        (receipt) =>
          receipt.status ===
          "BLOCKED_BY_PREREQUISITE",
      )
      .map((receipt) => receipt.requirementId)
      .sort();

  const capabilityGapKnowledgeIds =
    graph.knowledgeReceipts
      .filter(
        (receipt) =>
          receipt.status === "CAPABILITY_GAP",
      )
      .map((receipt) => receipt.requirementId)
      .sort();

  const scenarioIds = new Set(
    graph.scenarios.map((scenario) => scenario.id),
  );
  const incompleteCompositionScenarioIds =
    graph.scenarios
      .filter(
        (scenario) =>
          scenario.composedScenarioIds.some(
            (id) => !scenarioIds.has(id),
          ),
      )
      .map((scenario) => scenario.id)
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
  if (missingRequiredKnowledgeIds.length > 0) {
    reasons.push(
      "Required gameplay knowledge exists in the engine but did not return evidence to its scenario: " +
        missingRequiredKnowledgeIds.join(", ") +
        ".",
    );
  }
  if (prerequisiteBlockedKnowledgeIds.length > 0) {
    reasons.push(
      "Required inspection nodes are blocked by unsatisfied prerequisite nodes: " +
        prerequisiteBlockedKnowledgeIds.join(", ") +
        ".",
    );
  }
  if (capabilityGapKnowledgeIds.length > 0) {
    reasons.push(
      "Required gameplay knowledge has no registered analysis capability: " +
        capabilityGapKnowledgeIds.join(", ") +
        ".",
    );
  }
  if (incompleteCompositionScenarioIds.length > 0) {
    reasons.push(
      "Composition scenarios reference missing child scenarios: " +
        incompleteCompositionScenarioIds.join(", ") +
        ".",
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
    missingRequiredKnowledgeIds.length > 0 ||
    capabilityGapKnowledgeIds.length > 0 ||
    prerequisiteBlockedKnowledgeIds.length > 0 ||
    incompleteCompositionScenarioIds.length > 0 ||
    scenarioWithoutComponents.length > 0
      ? "OPEN" as const
      : runtimeBlockedCausalLinkIds.length > 0
        ? "PARTIAL" as const
        : "CLOSED" as const;

  if (status === "CLOSED") {
    reasons.push(
      "Every compiled gameplay component has a gameplay purpose and scenario correlation, every required knowledge domain returned an execution receipt, and every causal link is resolved.",
    );
  }

  return {
    status,
    orphanComponentIds,
    missingPurposeComponentIds,
    unresolvedCausalLinkIds,
    runtimeBlockedCausalLinkIds,
    detectionGapCausalLinkIds,
    missingRequiredKnowledgeIds,
    capabilityGapKnowledgeIds,
    prerequisiteBlockedKnowledgeIds,
    incompleteCompositionScenarioIds,
    reasons,
  };
}
