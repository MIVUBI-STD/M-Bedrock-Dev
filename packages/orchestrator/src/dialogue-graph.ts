import type { ParsedDialogueDocument } from "../../../analyzers/dialogue/src/index.js";
import { flattenCommandEffects } from "../../../analyzers/commands/src/index.js";
import { SemanticGraph } from "../../graph/src/index.js";
import type { SemanticNode } from "../../graph/src/index.js";
import { semanticNodeId } from "../../project-model/src/index.js";
import {
  commandEffectStateIdentifiers,
  populateCommandEffectEdges,
} from "./command-effect-graph.js";

export interface DialogueGraphDocument {
  parsed: ParsedDialogueDocument;
  sceneNodes: SemanticNode[];
}

export function createDialogueSceneNodes(
  graph: SemanticGraph,
  document: ParsedDialogueDocument,
  candidateNodes: SemanticNode[],
): DialogueGraphDocument {
  const sceneNodes = document.scenes.map((scene) => {
    const node: SemanticNode = {
      id: semanticNodeId("dialogue_scene", "project", scene.sceneTag),
      identity: {
        kind: "dialogue_scene",
        scope: "project",
        identifier: scene.sceneTag,
      },
      kind: "dialogue_scene",
      identifier: scene.sceneTag,
      source: document.source,
      data: {
        commandCount: scene.commands.length,
      },
    };
    graph.addNode(node);
    candidateNodes.push(node);
    return node;
  });

  return { parsed: document, sceneNodes };
}

export function dialogueStateIdentifiers(
  documents: readonly DialogueGraphDocument[],
): { scoreboardObjectives: string[]; tags: string[] } {
  const scoreboardObjectives = new Set<string>();
  const tags = new Set<string>();

  for (const document of documents) {
    for (const scene of document.parsed.scenes) {
      for (const command of scene.commands) {
        const ids = commandEffectStateIdentifiers(
          flattenCommandEffects(command.analysis),
        );
        for (const objective of ids.scoreboardObjectives) {
          scoreboardObjectives.add(objective);
        }
        for (const tag of ids.tags) tags.add(tag);
      }
    }
  }

  return {
    scoreboardObjectives: [...scoreboardObjectives].sort(),
    tags: [...tags].sort(),
  };
}

export function populateDialogueCommandGraph(
  graph: SemanticGraph,
  document: DialogueGraphDocument,
  candidateNodes: SemanticNode[],
): SemanticNode[] {
  const created: SemanticNode[] = [];

  document.parsed.scenes.forEach((scene, sceneIndex) => {
    const sceneNode = document.sceneNodes[sceneIndex];
    if (!sceneNode) return;

    scene.commands.forEach((command, commandIndex) => {
      const commandIdentifier =
        `${scene.sceneTag}#${command.trigger}:${command.buttonIndex ?? "none"}:${commandIndex}`;
      const node: SemanticNode = {
        id: semanticNodeId(
          "command",
          `dialogue:${scene.sceneTag}`,
          commandIdentifier,
        ),
        identity: {
          kind: "command",
          scope: `dialogue:${scene.sceneTag}`,
          identifier: commandIdentifier,
        },
        kind: "command",
        identifier: commandIdentifier,
        source: document.parsed.source,
        data: {
          command: command.raw,
          trigger: command.trigger,
          buttonIndex: command.buttonIndex ?? null,
        },
      };

      graph.addNode(node);
      candidateNodes.push(node);
      created.push(node);

      graph.addEdge({
        from: sceneNode.id,
        type: "CONTAINS",
        targetIdentifier: commandIdentifier,
        status: "resolved",
        to: node.id,
        evidence: { source: sceneNode.source },
      });

      for (const effect of flattenCommandEffects(command.analysis)) {
        populateCommandEffectEdges(graph, node, effect, candidateNodes);
      }
    });
  });

  return created;
}
