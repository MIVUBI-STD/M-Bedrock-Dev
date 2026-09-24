import type { CommandEffect } from "../../../analyzers/commands/src/effects.js";
import { resolveByIdentifier } from "../../../analyzers/references/src/index.js";
import { SemanticGraph } from "../../graph/src/graph.js";
import type { EdgeType, SemanticNode } from "../../graph/src/types.js";

export function addResolvedReferenceEdge(
  graph: SemanticGraph,
  from: SemanticNode,
  type: EdgeType,
  targetIdentifier: string,
  candidates: readonly SemanticNode[],
): void {
  const resolution = resolveByIdentifier(candidates, targetIdentifier);
  graph.addEdge({
    from: from.id,
    type,
    targetIdentifier,
    status: resolution.status,
    ...(resolution.to ? { to: resolution.to } : {}),
    ...(resolution.candidates ? { candidates: resolution.candidates } : {}),
    evidence: { source: from.source },
  });
}

export function populateCommandEffectEdges(
  graph: SemanticGraph,
  node: SemanticNode,
  effect: CommandEffect,
  candidateNodes: readonly SemanticNode[],
): void {
  if (effect.kind === "function-call") {
    addResolvedReferenceEdge(
      graph,
      node,
      "CALLS",
      effect.target,
      candidateNodes.filter((item) => item.kind === "function"),
    );
    return;
  }

  if (effect.kind === "structure-load") {
    addResolvedReferenceEdge(
      graph,
      node,
      "LOADS_STRUCTURE",
      effect.target,
      candidateNodes.filter((item) => item.kind === "structure"),
    );
    return;
  }

  if (effect.kind === "scoreboard-access") {
    const scoreboards = candidateNodes.filter(
      (item) => item.kind === "scoreboard_objective",
    );
    if (effect.access === "read" || effect.access === "read-write") {
      addResolvedReferenceEdge(
        graph,
        node,
        "READS_SCOREBOARD",
        effect.objective,
        scoreboards,
      );
    }
    if (effect.access === "write" || effect.access === "read-write") {
      addResolvedReferenceEdge(
        graph,
        node,
        "WRITES_SCOREBOARD",
        effect.objective,
        scoreboards,
      );
    }
    if (effect.otherObjective) {
      addResolvedReferenceEdge(
        graph,
        node,
        "READS_SCOREBOARD",
        effect.otherObjective,
        scoreboards,
      );
    }
    return;
  }

  if (effect.kind === "tag-mutation") {
    addResolvedReferenceEdge(
      graph,
      node,
      "WRITES_TAG",
      effect.tag,
      candidateNodes.filter((item) => item.kind === "tag"),
    );
    return;
  }

  if (effect.kind === "dialogue" && effect.sceneName) {
    addResolvedReferenceEdge(
      graph,
      node,
      "REFERENCES_DIALOGUE_SCENE",
      effect.sceneName,
      candidateNodes.filter((item) => item.kind === "dialogue_scene"),
    );
  }
}

export function commandEffectStateIdentifiers(
  effects: readonly CommandEffect[],
): { scoreboardObjectives: string[]; tags: string[] } {
  const scoreboardObjectives = new Set<string>();
  const tags = new Set<string>();

  for (const effect of effects) {
    if (effect.kind === "scoreboard-access") {
      scoreboardObjectives.add(effect.objective);
      if (effect.otherObjective) scoreboardObjectives.add(effect.otherObjective);
    }
    if (effect.kind === "tag-mutation") tags.add(effect.tag);
  }

  return {
    scoreboardObjectives: [...scoreboardObjectives].sort(),
    tags: [...tags].sort(),
  };
}
