import { describe, expect, it } from "vitest";
import {
  backwardDataFlowSlice,
  forwardDataFlowSlice,
  propagateDataFlowTaint,
  shortestDataFlowTaintWitness,
  validateDataFlowGraph,
  type DataFlowGraph,
} from "../src/index.js";

const graph: DataFlowGraph = {
  schemaVersion: 1,
  nodes: [
    { id: "a", kind: "binding", modulePath: "demo.ts", symbol: "source" },
    { id: "b", kind: "binding", modulePath: "demo.ts", symbol: "middle" },
    { id: "c", kind: "sink", modulePath: "demo.ts", symbol: "sink" },
  ],
  edges: [
    {
      id: "e1",
      from: "a",
      to: "b",
      kind: "assignment",
      confidence: "exact",
    },
    {
      id: "e2",
      from: "b",
      to: "c",
      kind: "argument",
      confidence: "exact",
    },
  ],
  unresolved: [],
};

describe("dataflow", () => {
  it("validates and slices forward/backward", () => {
    expect(validateDataFlowGraph(graph)).toEqual([]);
    expect(forwardDataFlowSlice(graph, ["a"]).nodeIds).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(backwardDataFlowSlice(graph, ["c"]).nodeIds).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("propagates caller-owned taint labels", () => {
    const result = propagateDataFlowTaint({
      graph,
      seeds: [{ nodeId: "a", label: "player-identity" }],
    });

    expect(result.truncated).toBe(false);
    expect(result.reached).toEqual([
      { nodeId: "a", labels: ["player-identity"] },
      { nodeId: "b", labels: ["player-identity"] },
      { nodeId: "c", labels: ["player-identity"] },
    ]);
  });

  it("honors explicit barriers", () => {
    const result = propagateDataFlowTaint({
      graph,
      seeds: [{ nodeId: "a", label: "player-identity" }],
      barrierNodeIds: ["b"],
    });

    expect(result.reached.map((item) => item.nodeId)).toEqual([
      "a",
      "b",
    ]);
  });

  it("returns shortest witness", () => {
    expect(
      shortestDataFlowTaintWitness(
        graph,
        { nodeId: "a", label: "player-identity" },
        "c",
      ),
    ).toEqual({
      label: "player-identity",
      sourceNodeId: "a",
      targetNodeId: "c",
      edgeIds: ["e1", "e2"],
    });
  });
});
