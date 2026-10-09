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
    | "unowned-execution-edge"
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
    ...intent.nodes.filter(node => node.status === "authored").flatMap(node => node.evidenceIds),
    ...intent.edges.filter(edge => edge.status === "authored").flatMap(edge => edge.evidenceIds),
    // Scenario causal proof does not establish exact execution ownership.
    // Only authored intent may admit a matching Semantic IR evidence ID.
    // Knowledge satisfaction does not establish execution ownership.
    // Receipts remain in the scenario graph, not the IR ownership admission set.
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
  for (const region of input.semanticIr.execution.regions) {
    if (ownedRegions.has(region.id)) {
      continue;
    }
    output.push({
      id: "discovery-challenge:region:" + region.id,
      kind: "unowned-execution-region",
      subjectId: region.id,
      evidenceIds: [region.id],
      reason:
        "Authored execution region is present in Semantic IR but lacks an exact gameplay/scenario evidence owner; source presence alone does not prove activation or meaning.",
    });
  }

  for (const edge of input.semanticIr.execution.edges) {
    if (edge.resolution === "resolved" && evidence.has(edge.id)) {
      continue;
    }
    const unresolved = edge.resolution === "unresolved";
    output.push({
      id: "discovery-challenge:edge:" + edge.id,
      kind: unresolved
        ? "unresolved-execution-edge"
        : "unowned-execution-edge",
      subjectId: edge.from,
      evidenceIds: [edge.id],
      reason: unresolved
        ? "Execution edge target is unresolved, so downstream gameplay effects may exist outside the current semantic graph."
        : "Resolved execution edge is not consumed by gameplay intent/scenario evidence; target resolution alone does not establish its gameplay meaning.",
    });
  }

  for (const relation of input.semanticIr.temporal.relations) {
    // A generation guard proves a scheduling safety property, not that
    // the temporal relation has a gameplay/scenario owner.
    const relatedEvidence = evidence.has(relation.id);
    // Evidence ownership cannot turn an unresolved scheduler target into
    // a resolved execution path.
    if (relatedEvidence && relation.resolution === "resolved") continue;
    output.push({
      id: "discovery-challenge:temporal:" + relation.id,
      kind: "unowned-temporal-relation",
      subjectId: relation.from,
      evidenceIds: [relation.id],
      reason: relation.resolution === "unresolved"
        ? "Deferred/periodic target remains unresolved even when the relation is referenced by gameplay evidence."
        : "Deferred/periodic relation is not semantically owned by a gameplay scenario, so stale work or hidden lifecycle effects may be missed.",
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
