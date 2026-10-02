import { describe, expect, it } from "vitest";
import {
  compileDataFlowContextSlice,
} from "../../src/inspection/script-dataflow-context.js";

describe("dataflow context slice capability", () => {
  it("returns a bounded complete backward slice for a known seed", () => {
    const graph = {
      schemaVersion: 1 as const,
      nodes: [{
        id: "source",
        kind: "literal" as const,
        modulePath: "main.ts",
        regionId: "module",
        label: "1",
      }, {
        id: "target",
        kind: "binding" as const,
        modulePath: "main.ts",
        regionId: "module",
        symbol: "value",
        label: "value",
      }],
      edges: [{
        id: "edge:1",
        from: "source",
        to: "target",
        kind: "assignment" as const,
        confidence: "exact" as const,
      }],
      unresolved: [],
    };

    const result =
      compileDataFlowContextSlice({
        graph,
        seedNodeIds: ["target"],
        direction: "backward",
        maxNodes: 8,
        maxEdges: 8,
      });

    expect(
      result.nodes.map((item) => item.id),
    ).toEqual(["source", "target"]);
    expect(result.edges).toHaveLength(1);
    expect(result.complete).toBe(true);
    expect(result.missingSeedNodeIds).toEqual([]);
  });
});
