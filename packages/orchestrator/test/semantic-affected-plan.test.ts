import {
  describe,
  expect,
  it,
} from "vitest";
import {
  SemanticGraph,
} from "../../graph/src/index.js";
import type {
  PatchTransaction,
} from "../../repair/src/index.js";
import {
  planPatchSemanticAffectedSet,
  planSemanticAffectedSet,
} from "../src/semantic-affected-plan.js";

function graphFixture(): SemanticGraph {
  const graph = new SemanticGraph();

  for (const identifier of [
    "caller",
    "changed",
    "unrelated",
  ]) {
    graph.addNode({
      id: "function:pack:" + identifier,
      identity: {
        kind: "function",
        scope: "pack",
        identifier,
      },
      kind: "function",
      identifier,
      source: {
        artifactId: "map",
        relativePath:
          "functions/" +
          identifier +
          ".mcfunction",
      },
    });
  }

  graph.addEdge({
    from: "function:pack:caller",
    type: "CALLS",
    targetIdentifier: "changed",
    status: "resolved",
    to: "function:pack:changed",
    evidence: {
      source: {
        artifactId: "map",
        relativePath:
          "functions/caller.mcfunction",
      },
    },
  });

  return graph;
}

describe("semantic affected planning", () => {
  it("keeps only changed nodes and reverse dependents in the affected closure", () => {
    const result =
      planSemanticAffectedSet(
        graphFixture(),
        ["function:pack:changed"],
      );

    expect(result.status).toBe(
      "planned",
    );
    expect(result.affectedNodeIds)
      .toEqual([
        "function:pack:caller",
        "function:pack:changed",
      ]);
    expect(result.skippedNodeIds)
      .toEqual([
        "function:pack:unrelated",
      ]);
    expect(result.skippedNodeCount)
      .toBe(1);
    expect(result.skipRatio)
      .toBeCloseTo(1 / 3);
  });

  it("derives the affected closure directly from patch source references", () => {
    const transaction:
      PatchTransaction = {
      id: "patch:1",
      title: "change function",
      sourceFingerprint: "source",
      operations: [{
        kind: "replace-command",
        source: {
          artifactId: "map",
          relativePath:
            "functions/changed.mcfunction",
        },
        expected: "say old",
        replacement: "say new",
      }],
      preconditions: [],
      validation: [],
      affectedPaths: [
        "functions/changed.mcfunction",
      ],
    };

    const result =
      planPatchSemanticAffectedSet(
        graphFixture(),
        transaction,
      );

    expect(result.status).toBe(
      "planned",
    );
    expect(result.changedNodeIds)
      .toEqual([
        "function:pack:changed",
      ]);
    expect(result.affectedNodeIds)
      .toContain(
        "function:pack:caller",
      );
    expect(result.skippedNodeIds)
      .toEqual([
        "function:pack:unrelated",
      ]);
  });

  it("blocks selective validation when a patch operation cannot bind to the graph", () => {
    const transaction:
      PatchTransaction = {
      id: "patch:missing",
      title: "unknown source",
      sourceFingerprint: "source",
      operations: [{
        kind: "replace-command",
        source: {
          artifactId: "map",
          relativePath:
            "functions/missing.mcfunction",
        },
        expected: "say old",
        replacement: "say new",
      }],
      preconditions: [],
      validation: [],
      affectedPaths: [
        "functions/missing.mcfunction",
      ],
    };

    const result =
      planPatchSemanticAffectedSet(
        graphFixture(),
        transaction,
      );

    expect(result.status).toBe(
      "blocked",
    );
    expect(
      result.unmatchedOperationPaths,
    ).toEqual([
      "functions/missing.mcfunction",
    ]);
  });
});
