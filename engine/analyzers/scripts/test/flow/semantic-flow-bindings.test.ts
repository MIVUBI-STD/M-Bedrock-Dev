import { describe, expect, it } from "vitest";
import {
  deriveScriptSemanticFlowBindings,
} from "../../src/flow/semantic-flow-bindings.js";
import type { DataFlowGraph } from "../../../../packages/dataflow/src/index.js";

const graph: DataFlowGraph = {
  schemaVersion: 1,
  nodes: [
    {
      id: "call:getPlayers",
      kind: "call",
      modulePath: "scripts/main.ts",
      regionId: "function:start",
      symbol: "world.getAllPlayers",
    },
    {
      id: "call:teleport",
      kind: "call",
      modulePath: "scripts/main.ts",
      regionId: "function:start",
      symbol: "player.teleport",
    },
    {
      id: "call:setDynamic",
      kind: "call",
      modulePath: "scripts/main.ts",
      regionId: "function:start",
      symbol: "player.setDynamicProperty",
    },
  ],
  edges: [],
  unresolved: [],
};

describe("script semantic flow bindings", () => {
  it("labels player identity sources and sinks without emitting defects", () => {
    const bindings = deriveScriptSemanticFlowBindings(graph, []);
    expect(bindings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        nodeId: "call:getPlayers",
        label: "player-identity",
        role: "source",
      }),
      expect.objectContaining({
        nodeId: "call:teleport",
        label: "player-identity",
        role: "sink",
      }),
      expect.objectContaining({
        nodeId: "call:setDynamic",
        label: "persistent-state",
        role: "sink",
      }),
    ]));
  });
});
