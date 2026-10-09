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
    | "unowned-return-outcome"
    | "unowned-resource-action"
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
  // An authored label is insufficient without a registered selected-artifact
  // evidence record. Unregistered IDs must not close Semantic IR challenges.
  const groundedIds = new Set(intent.evidence
    .filter(item => item.scope === "selected-artifact")
    .map(item => item.id));
  const authoredEvidenceIds = new Set([
    ...intent.nodes.filter(node => node.status === "authored")
      .flatMap(node => node.evidenceIds),
    ...intent.edges.filter(edge => edge.status === "authored")
      .flatMap(edge => edge.evidenceIds),
  ]);
  // Scenario composition must consume the same exact evidence identity.
  // A stranded intent fact is not proof of a modeled gameplay path.
  // Neither component placement nor unproven links establish a gameplay path.
  const scenarioLinkIds = new Map(graph.scenarios.map(scenario =>
    [scenario.id, new Set(scenario.causalLinkIds)]));
  const scenarioEvidenceIds = new Set(graph.causalLinks
    .filter(link => link.status === "PROVEN" &&
      scenarioLinkIds.get(link.scenarioId)?.has(link.id) === true)
    .flatMap(link => link.evidenceIds));
  return new Set([...authoredEvidenceIds].filter(id =>
    groundedIds.has(id) && scenarioEvidenceIds.has(id)));
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
  const evidenceLocations = new Map(input.intent.evidence
    .filter(item => item.scope === "selected-artifact")
    .map(item => [item.id, item.locator.replaceAll("\\", "/")]));
  const matchesSource = (id: string, path: string): boolean =>
    evidence.has(id) && evidenceLocations.get(id) === path.replaceAll("\\", "/");

  for (const operation of input.semanticIr.state.operations) {
    // Surface ownership alone does not account for every state mutation.
    // Require the individual operation to be consumed as evidence.
    if (matchesSource(operation.id, operation.source.relativePath)) {
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

  for (const outcome of input.semanticIr.execution.outcomes ?? []) {
    if (matchesSource(outcome.id, outcome.source.relativePath)) continue;
    output.push({
      id: "discovery-challenge:outcome:" + outcome.id,
      kind: "unowned-return-outcome",
      subjectId: outcome.executionRegionId,
      evidenceIds: [outcome.id],
      reason:
        "An authored function return value is not reconciled with a gameplay scenario; its property/value cannot establish a win/loss or player-visible outcome.",
    });
  }

  for (const action of input.semanticIr.state.resourceActions ?? []) {
    if (matchesSource(action.id, action.source.relativePath)) continue;
    output.push({
      id: "discovery-challenge:resource:" + action.id,
      kind: "unowned-resource-action",
      subjectId: action.executionRegionId,
      evidenceIds: [action.id],
      reason:
        "An authored acquire/release action is not reconciled with a gameplay scenario; it does not by itself prove cleanup or successful reset.",
    });
  }

  // A consumed state mutation does not prove ownership of the whole
  // executable region, which may contain other unmodeled behavior.
  const ownedRegions = new Set(
    input.semanticIr.execution.regions
      .filter((region) => region.source !== undefined &&
        matchesSource(region.id, region.source.relativePath))
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
    if (edge.resolution === "resolved" && matchesSource(edge.id, edge.source.relativePath)) {
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
    const relatedEvidence = matchesSource(relation.id, relation.source.relativePath);
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
