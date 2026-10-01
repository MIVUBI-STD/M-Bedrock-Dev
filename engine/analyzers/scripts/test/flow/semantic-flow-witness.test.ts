import { describe, expect, it } from "vitest";
import type {
  DataFlowGraph,
} from "../../../../packages/dataflow/src/index.js";
import {
  deriveScriptSemanticFlowWitnesses,
} from "../../src/flow/semantic-flow-witness.js";

const graph: DataFlowGraph = {
  schemaVersion: 1,
  nodes: [
    {
      id: "source",
      kind: "call",
      modulePath: "scripts/main.ts",
      symbol: "world.getAllPlayers",
    },
    {
      id: "middle",
      kind: "binding",
      modulePath: "scripts/main.ts",
      symbol: "player",
    },
    {
      id: "sink",
      kind: "call",
      modulePath: "scripts/main.ts",
      symbol: "player.teleport",
    },
  ],
  edges: [
    {
      id: "e1",
      from: "source",
      to: "middle",
      kind: "assignment",
      confidence: "exact",
    },
    {
      id: "e2",
      from: "middle",
      to: "sink",
      kind: "argument",
      confidence: "exact",
    },
  ],
  unresolved: [],
};

describe("semantic flow witnesses", () => {
  it("produces the shortest evidence path without declaring a defect", () => {
    const result =
      deriveScriptSemanticFlowWitnesses(
        graph,
        [
          {
            nodeId: "source",
            label: "player-identity",
            role: "source",
            basis: "player lookup",
            confidence: "exact",
          },
          {
            nodeId: "sink",
            label: "player-identity",
            role: "sink",
            basis: "teleport",
            confidence: "exact",
          },
        ],
      );

    expect(result.witnesses).toEqual([
      expect.objectContaining({
        label: "player-identity",
        sourceNodeId: "source",
        sinkNodeId: "sink",
        edgeIds: ["e1", "e2"],
        confidence: "exact",
      }),
    ]);
  });

  it("honors explicit barriers", () => {
    const result =
      deriveScriptSemanticFlowWitnesses(
        graph,
        [
          {
            nodeId: "source",
            label: "player-identity",
            role: "source",
            basis: "player lookup",
            confidence: "exact",
          },
          {
            nodeId: "sink",
            label: "player-identity",
            role: "sink",
            basis: "teleport",
            confidence: "exact",
          },
        ],
        { barrierNodeIds: ["middle"] },
      );

    expect(result.witnesses).toEqual([]);
  });
});
