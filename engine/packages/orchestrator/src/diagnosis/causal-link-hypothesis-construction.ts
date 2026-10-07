import type {
  DiagnosticHypothesisSet,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  GameplayDefectResolution,
} from "../inspection/gameplay-defect-resolution.js";
import type {
  GameplayScenarioGraph,
} from "../inspection/gameplay-scenario-model.js";

export interface CausalLinkHypothesisConstruction {
  causalLinkId: string;
  hypothesisSet: DiagnosticHypothesisSet;
  evidenceIds: readonly string[];
  requiredPredicateIds: readonly string[];
  falsifierPredicateIds: readonly string[];
}

function predicate(
  causalLinkId: string,
  role: "contradiction" | "runtime" | "counterproof" | "knowledge",
  ownerId?: string,
): string {
  return [
    "causal-link",
    causalLinkId,
    role,
    ownerId ?? "none",
  ].join(":");
}

export function constructCausalLinkHypothesis(input: {
  graph: GameplayScenarioGraph;
  resolution: GameplayDefectResolution;
}): CausalLinkHypothesisConstruction | undefined {
  const link = input.graph.causalLinks.find(
    (item) => item.id === input.resolution.causalLinkId,
  );
  if (!link) return undefined;
  const scenario = input.graph.scenarios.find(
    (item) => item.id === link.scenarioId,
  );
  if (!scenario) return undefined;

  const knowledgeRequirements =
    link.knowledgeRequirementIds
      .map((id) =>
        input.graph.knowledgeRequirements.find(
          (item) => item.id === id,
        )
      )
      .filter((item): item is NonNullable<typeof item> =>
        item !== undefined
      );
  const knowledgeReceipts =
    link.knowledgeRequirementIds
      .map((id) =>
        input.graph.knowledgeReceipts.find(
          (item) => item.requirementId === id,
        )
      )
      .filter((item): item is NonNullable<typeof item> =>
        item !== undefined
      );

  const contradiction = predicate(link.id, "contradiction");
  const runtime = input.resolution.disposition === "RUNTIME_PROOF_REQUIRED"
    ? predicate(link.id, "runtime")
    : undefined;
  const knowledgeRequirementPredicates =
    knowledgeRequirements.map((knowledge) =>
      predicate(link.id, "knowledge", knowledge.id)
    );
  const knowledgePredicates =
    knowledgeReceipts
      .flatMap((receipt) => receipt.knowledgeIds)
      .filter((id, index, all) => all.indexOf(id) === index)
      .sort()
      .map((knowledgeId) =>
        predicate(
          link.id,
          "knowledge",
          knowledgeId,
        )
      );
  const counterproof = predicate(link.id, "counterproof");

  const requiredPredicates = [
    contradiction,
    ...(runtime ? [runtime] : []),
    ...knowledgeRequirementPredicates,
    ...knowledgePredicates,
  ];
  const falsifierPredicates = [counterproof];

  return {
    causalLinkId: link.id,
    hypothesisSet: {
      schemaVersion: 1,
      id: "causal-link-hypothesis:" + link.id,
      hypotheses: [{
        id: "causal-link-defect:" + link.id,
        statement:
          "The contradicted dependency '" + link.purpose +
          "' causes the observed scenario outcome for '" +
          scenario.purpose + "'.",
        requiredPredicates,
        falsifierPredicates,
      }],
    },
    evidenceIds: [...new Set([
      ...link.evidenceIds,
      ...(input.resolution.evidenceIds ?? []),
    ])].sort(),
    requiredPredicateIds: requiredPredicates,
    falsifierPredicateIds: falsifierPredicates,
  };
}
