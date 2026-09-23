import type { CommandEffect } from "../../../analyzers/commands/src/effects.js";
import { resolveByIdentifier } from "../../../analyzers/references/src/resolve.js";
import { SemanticGraph } from "../../graph/src/graph.js";
import type { EdgeType, SemanticNode } from "../../graph/src/types.js";
import { semanticNodeId } from "../../project-model/src/identity.js";
import type { EmbeddedStructureCommandAnalysis } from "./embedded-structure-commands.js";

function addResolvedEdge(
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

function edgesForEffect(
  graph: SemanticGraph,
  node: SemanticNode,
  effect: CommandEffect,
  candidateNodes: readonly SemanticNode[],
): void {
  if (effect.kind === "function-call") {
    addResolvedEdge(
      graph,
      node,
      "CALLS",
      effect.target,
      candidateNodes.filter((item) => item.kind === "function"),
    );
    return;
  }

  if (effect.kind === "structure-load") {
    addResolvedEdge(
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
      addResolvedEdge(graph, node, "READS_SCOREBOARD", effect.objective, scoreboards);
    }
    if (effect.access === "write" || effect.access === "read-write") {
      addResolvedEdge(graph, node, "WRITES_SCOREBOARD", effect.objective, scoreboards);
    }
    if (effect.otherObjective) {
      addResolvedEdge(
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
    addResolvedEdge(
      graph,
      node,
      "WRITES_TAG",
      effect.tag,
      candidateNodes.filter((item) => item.kind === "tag"),
    );
  }
}

export function embeddedCommandStateIdentifiers(
  analyses: readonly EmbeddedStructureCommandAnalysis[],
): {
  scoreboardObjectives: string[];
  tags: string[];
} {
  const scoreboardObjectives = new Set<string>();
  const tags = new Set<string>();

  for (const analysis of analyses) {
    for (const effect of analysis.effects) {
      if (effect.kind === "scoreboard-access") {
        scoreboardObjectives.add(effect.objective);
        if (effect.otherObjective) scoreboardObjectives.add(effect.otherObjective);
      }
      if (effect.kind === "tag-mutation") tags.add(effect.tag);
    }
  }

  return {
    scoreboardObjectives: [...scoreboardObjectives].sort(),
    tags: [...tags].sort(),
  };
}

export function populateEmbeddedStructureCommandGraph(
  graph: SemanticGraph,
  structureNode: SemanticNode,
  structureIdentifier: string,
  analyses: readonly EmbeddedStructureCommandAnalysis[],
  candidateNodes: SemanticNode[],
): SemanticNode[] {
  const created: SemanticNode[] = [];

  for (const analysis of analyses) {
    const identifier = `${structureIdentifier}#command:${analysis.block.flatIndex}`;
    const node: SemanticNode = {
      id: semanticNodeId("command", `structure:${structureIdentifier}`, String(analysis.block.flatIndex)),
      identity: {
        kind: "command",
        scope: `structure:${structureIdentifier}`,
        identifier: String(analysis.block.flatIndex),
      },
      kind: "command",
      identifier,
      source: structureNode.source,
      data: {
        command: analysis.block.command,
        flatIndex: analysis.block.flatIndex,
        coordinate: analysis.block.coordinate ?? null,
        auto: analysis.block.auto ?? null,
        conditional: analysis.block.conditional ?? null,
        tickDelay: analysis.block.tickDelay ?? null,
      },
    };

    graph.addNode(node);
    candidateNodes.push(node);
    created.push(node);

    graph.addEdge({
      from: structureNode.id,
      type: "CONTAINS",
      targetIdentifier: identifier,
      status: "resolved",
      to: node.id,
      evidence: { source: structureNode.source },
    });

    for (const effect of analysis.effects) {
      edgesForEffect(graph, node, effect, candidateNodes);
    }
  }

  return created;
}
