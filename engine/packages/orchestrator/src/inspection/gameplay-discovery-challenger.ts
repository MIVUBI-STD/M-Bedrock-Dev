import type {
  SemanticIr,
} from "../../../semantic-ir/src/index.js";
import type {
  GameplayIntentModel,
} from "../../../gameplay-intent/src/index.js";
import type {
  GameplayScenarioGraph,
} from "./gameplay-scenario-model.js";

export interface GameplayDiscoveryChallengeSignal {
  readonly id: string;
  readonly kind:
    | "unowned-state-operation"
    | "unowned-execution-region"
    | "unresolved-execution-edge"
    | "unowned-temporal-relation";
  readonly subjectId: string;
  readonly evidenceIds: readonly string[];
  readonly reason: string;
}

function usedEvidenceIds(
  intent: GameplayIntentModel,
  graph: GameplayScenarioGraph,
): ReadonlySet<string> {
  return new Set([
    ...intent.nodes.flatMap((node) => node.evidenceIds),
    ...intent.edges.flatMap((edge) => edge.evidenceIds),
    ...graph.components.flatMap((component) => component.evidenceIds),
    ...graph.causalLinks.flatMap((link) => link.evidenceIds),
    ...graph.knowledgeReceipts.flatMap((receipt) => receipt.evidenceIds),
  ]);
}

/**
 * Challenges Discovery Closure from the opposite direction:
 * raw executable/state evidence must not disappear merely because no semantic
 * owner was reconstructed for it.
 */
export function challengeGameplayDiscovery(input: {
  readonly semanticIr: SemanticIr;
  readonly intent: GameplayIntentModel;
  readonly graph: GameplayScenarioGraph;
}): readonly GameplayDiscoveryChallengeSignal[] {
  const evidence = usedEvidenceIds(
    input.intent,
    input.graph,
  );
  const output: GameplayDiscoveryChallengeSignal[] = [];

  for (const operation of input.semanticIr.state.operations) {
    // Surface ownership alone does not account for every state mutation.
    // Require the individual operation to be consumed as evidence.
    if (evidence.has(operation.id)) {
      continue;
    }
    output.push({
      id: "discovery-challenge:state:" + operation.id,
      kind: "unowned-state-operation",
      subjectId: operation.surfaceId,
      evidenceIds: [operation.id],
      reason:
        "Semantic IR contains a material state operation that is not consumed by gameplay intent/scenario evidence. Its gameplay meaning may be missing from discovery.",
    });
  }

  // A consumed state mutation does not prove ownership of the whole
  // executable region, which may contain other unmodeled behavior.
  const ownedRegions = new Set(
    input.semanticIr.execution.regions
      .filter((region) => evidence.has(region.id))
      .map((region) => region.id),
  );
  const regionsWithGraphEdges = new Set(
    input.semanticIr.execution.edges.flatMap((edge) => [
      edge.from,
      ...(edge.to === undefined ? [] : [edge.to]),
    ]),
  );

  for (const region of input.semanticIr.execution.regions) {
    if (
      ownedRegions.has(region.id) ||
      !regionsWithGraphEdges.has(region.id)
    ) {
      continue;
    }
    output.push({
      id: "discovery-challenge:region:" + region.id,
      kind: "unowned-execution-region",
      subjectId: region.id,
      evidenceIds: [region.id],
      reason:
        "Executable region participates in the selected-artifact execution graph but has no grounded gameplay/state owner.",
    });
  }

  for (const edge of input.semanticIr.execution.edges) {
    if (edge.resolution !== "unresolved") continue;
    output.push({
      id: "discovery-challenge:edge:" + edge.id,
      kind: "unresolved-execution-edge",
      subjectId: edge.from,
      evidenceIds: [edge.id],
      reason:
        "Execution edge target is unresolved, so downstream gameplay effects may exist outside the current semantic graph.",
    });
  }

  for (const relation of input.semanticIr.temporal.relations) {
    // A generation guard proves a scheduling safety property, not that
    // the temporal relation has a gameplay/scenario owner.
    const relatedEvidence = evidence.has(relation.id);
    if (relatedEvidence) continue;
    output.push({
      id: "discovery-challenge:temporal:" + relation.id,
      kind: "unowned-temporal-relation",
      subjectId: relation.from,
      evidenceIds: [relation.id],
      reason:
        "Deferred/periodic relation is not semantically owned by a gameplay scenario, so stale work or hidden lifecycle effects may be missed.",
    });
  }

  return output
    .filter(
      (item, index, all) =>
        all.findIndex(
          (candidate) => candidate.id === item.id,
        ) === index,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}
