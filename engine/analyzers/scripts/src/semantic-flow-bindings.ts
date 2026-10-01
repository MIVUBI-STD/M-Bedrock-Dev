import type { DataFlowGraph } from "../../../packages/dataflow/src/index.js";
import type { ParsedScriptFile } from "./types.js";

export type ScriptSemanticFlowLabel =
  | "player-identity"
  | "arena-identity"
  | "persistent-state"
  | "reward-entitlement"
  | "world-mutation"
  | "combat-target"
  | "inventory-target";

export interface ScriptSemanticFlowBinding {
  nodeId: string;
  label: ScriptSemanticFlowLabel;
  role: "source" | "sink";
  basis: string;
  confidence: "exact" | "bounded";
}

function callNodes(graph: DataFlowGraph, predicate: (symbol: string) => boolean) {
  return graph.nodes.filter((node) =>
    node.kind === "call" &&
    typeof node.symbol === "string" &&
    predicate(node.symbol)
  );
}

export function deriveScriptSemanticFlowBindings(
  graph: DataFlowGraph,
  files: readonly ParsedScriptFile[],
): ScriptSemanticFlowBinding[] {
  const output: ScriptSemanticFlowBinding[] = [];
  const add = (
    nodeId: string,
    label: ScriptSemanticFlowLabel,
    role: "source" | "sink",
    basis: string,
    confidence: "exact" | "bounded" = "exact",
  ) => output.push({ nodeId, label, role, basis, confidence });

  for (const node of callNodes(graph, (symbol) =>
    /getPlayers|getAllPlayers|getEntity|player/i.test(symbol)
  )) add(node.id, "player-identity", "source", "Player/entity lookup or event-derived call.");

  for (const node of callNodes(graph, (symbol) =>
    /teleport|setSpawnPoint|runCommand/i.test(symbol)
  )) add(node.id, "player-identity", "sink", "Player-affecting action.");

  for (const node of callNodes(graph, (symbol) =>
    /getDynamicProperty/i.test(symbol)
  )) add(node.id, "persistent-state", "source", "Persistent dynamic-property read.");

  for (const node of callNodes(graph, (symbol) =>
    /setDynamicProperty|clearDynamicProperties/i.test(symbol)
  )) add(node.id, "persistent-state", "sink", "Persistent dynamic-property mutation.");

  for (const node of callNodes(graph, (symbol) =>
    /addScore|setScore|give|spawnItem/i.test(symbol)
  )) add(node.id, "reward-entitlement", "sink", "Reward/economy side effect.", "bounded");

  for (const node of callNodes(graph, (symbol) =>
    /setBlock|fillBlocks|place|spawnEntity/i.test(symbol)
  )) add(node.id, "world-mutation", "sink", "World mutation call.", "bounded");

  for (const file of files) {
    for (const event of file.events ?? []) {
      if (/player|spawn|join|leave|hurt|die/i.test(event.event)) {
        const candidates = graph.nodes.filter((node) =>
          node.modulePath === file.source.relativePath &&
          node.regionId === event.callbackRegion
        );
        for (const node of candidates) {
          add(node.id, "player-identity", "source", "Player lifecycle event callback.", "bounded");
        }
      }
    }
  }

  const unique = new Map(
    output.map((item) => [
      [item.nodeId, item.label, item.role, item.basis].join("\u0000"),
      item,
    ]),
  );
  return [...unique.values()].sort((a, b) =>
    a.nodeId.localeCompare(b.nodeId) ||
    a.label.localeCompare(b.label) ||
    a.role.localeCompare(b.role)
  );
}
