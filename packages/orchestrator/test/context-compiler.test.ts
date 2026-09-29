import {
  describe,
  expect,
  it,
} from "vitest";
import {
  SemanticGraph,
} from "../../graph/src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import {
  compileContextPack,
} from "../src/context-compiler.js";

function fixtureGraph() {
  const graph =
    new SemanticGraph();
  for (const id of [
    "arena",
    "shop",
    "unrelated",
  ]) {
    graph.addNode({
      id: "function:pack:" + id,
      identity: {
        kind: "function",
        scope: "pack",
        identifier: id,
      },
      kind: "function",
      identifier: id,
      source: {
        artifactId: "map",
        relativePath:
          "functions/" +
          id +
          ".mcfunction",
      },
    });
  }
  graph.addEdge({
    from: "function:pack:arena",
    type: "CALLS",
    targetIdentifier: "shop",
    status: "resolved",
    to: "function:pack:shop",
    evidence: {
      source: {
        artifactId: "map",
        relativePath:
          "functions/arena.mcfunction",
      },
    },
  });
  return graph;
}

const intent: GameplayIntentModel = {
  schemaVersion: 1,
  id: "intent:map",
  evidence: [{
    id: "e:arena",
    origin: "source-code",
    locator:
      "functions/arena.mcfunction",
    summary: "arena state",
  }, {
    id: "e:shop",
    origin: "source-code",
    locator:
      "functions/shop.mcfunction",
    summary: "shop state",
  }],
  nodes: [{
    id: "intent:arena",
    kind: "mechanic",
    label: "Arena",
    status: "authored",
    evidenceIds: ["e:arena"],
  }, {
    id: "intent:shop",
    kind: "mechanic",
    label: "Shop",
    status: "authored",
    evidenceIds: ["e:shop"],
  }],
  edges: [],
  invariants: [{
    id: "inv:arena",
    statement:
      "Player belongs to one arena",
    strength: "must",
    status: "authored",
    subjectIds: ["intent:arena"],
    evidenceIds: ["e:arena"],
  }],
  unknowns: [{
    id: "unknown:arena",
    question: "Arena cleanup?",
    blockedSubjectIds: [
      "intent:arena",
    ],
    evidenceIds: ["e:arena"],
  }],
};

describe("context compiler", () => {
  it("restricts semantic context to affected nodes and explicit intent subjects", () => {
    const pack =
      compileContextPack({
        goal: "diagnose arena",
        graph: fixtureGraph(),
        intent,
        affected: {
          status: "planned",
          changedNodeIds: [
            "function:pack:arena",
          ],
          affectedNodeIds: [
            "function:pack:arena",
          ],
          skippedNodeIds: [
            "function:pack:shop",
            "function:pack:unrelated",
          ],
          affectedPaths: [
            "functions/arena.mcfunction",
          ],
          knownPaths: [
            "functions/arena.mcfunction",
            "functions/shop.mcfunction",
            "functions/unrelated.mcfunction",
          ],
          totalNodeCount: 3,
          changedNodeCount: 1,
          affectedNodeCount: 1,
          skippedNodeCount: 2,
          skipRatio: 2 / 3,
          reasons: [],
        },
        relevantIntentSubjectIds: [
          "intent:arena",
        ],
      });

    expect(
      pack.semantic.nodes.map(
        (node) => node.id,
      ),
    ).toEqual([
      "function:pack:arena",
    ]);
    expect(
      pack.intent.nodes.map(
        (node) => node.id,
      ),
    ).toEqual([
      "intent:arena",
    ]);
    expect(
      pack.intent.evidence.map(
        (item) => item.id,
      ),
    ).toEqual(["e:arena"]);
    expect(pack.semantic.edges)
      .toHaveLength(1);
    expect(
      pack.semantic.edges[0]?.type,
    ).toBe("CALLS");
  });

  it("uses explicit invariant and evidence relationships to avoid unrelated intent nodes", () => {
    const byInvariant =
      compileContextPack({
        goal: "invariant-only",
        graph: fixtureGraph(),
        intent,
        relevantInvariantIds: [
          "inv:arena",
        ],
      });

    expect(
      byInvariant.intent.nodes.map(
        (node) => node.id,
      ),
    ).toEqual([
      "intent:arena",
    ]);

    const byEvidence =
      compileContextPack({
        goal: "evidence-only",
        graph: fixtureGraph(),
        intent,
        relevantEvidenceIds: [
          "e:shop",
        ],
      });

    expect(
      byEvidence.intent.nodes.map(
        (node) => node.id,
      ),
    ).toEqual([
      "intent:shop",
    ]);
  });

  it("does not widen to every intent node when explicit evidence has no subject binding", () => {
    const pack =
      compileContextPack({
        goal: "evidence-no-subject",
        graph: fixtureGraph(),
        intent: {
          ...intent,
          evidence: [
            ...intent.evidence,
            {
              id: "e:global",
              origin: "source-code",
              locator:
                "global/source",
              summary:
                "global evidence",
            },
          ],
        },
        relevantEvidenceIds: [
          "e:global",
        ],
      });

    expect(pack.intent.nodes)
      .toEqual([]);
    expect(
      pack.intent.evidence.map(
        (item) => item.id,
      ),
    ).toEqual(["e:global"]);
  });

  it("reports truncation instead of silently overloading context", () => {
    const pack =
      compileContextPack({
        goal: "bounded",
        graph: fixtureGraph(),
        intent,
        budget: {
          maxSemanticNodes: 1,
          maxSemanticEdges: 1,
          maxIntentNodes: 1,
        },
      });

    expect(
      pack.semantic.nodes,
    ).toHaveLength(1);
    expect(
      pack.truncation
        .semanticNodes,
    ).toBe(2);
    expect(
      pack.truncation.intentNodes,
    ).toBe(1);
    expect(pack.complete)
      .toBe(false);
  });

  it("allows optional truncation when explicit required scope is fully retained", () => {
    const pack =
      compileContextPack({
        goal: "scoped-bounded",
        graph: fixtureGraph(),
        intent,
        relevantSemanticNodeIds: [
          "function:pack:arena",
        ],
        relevantIntentSubjectIds: [
          "intent:arena",
        ],
        budget: {
          maxSemanticNodes: 1,
          maxSemanticEdges: 1,
          maxIntentNodes: 1,
        },
      });

    expect(pack.complete)
      .toBe(true);
    expect(
      pack.semantic.nodes.map(
        (node) => node.id,
      ),
    ).toEqual([
      "function:pack:arena",
    ]);
    expect(
      pack.truncation.semanticNodes,
    ).toBeGreaterThan(0);
  });

  it("includes explicitly required semantic nodes even when they are outside the affected closure", () => {
    const pack =
      compileContextPack({
        goal: "explicit-outside-affected",
        graph: fixtureGraph(),
        intent,
        affected: {
          status: "planned",
          changedNodeIds: [
            "function:pack:arena",
          ],
          affectedNodeIds: [
            "function:pack:arena",
          ],
          skippedNodeIds: [
            "function:pack:shop",
            "function:pack:unrelated",
          ],
          affectedPaths: [
            "functions/arena.mcfunction",
          ],
          knownPaths: [
            "functions/arena.mcfunction",
            "functions/shop.mcfunction",
            "functions/unrelated.mcfunction",
          ],
          totalNodeCount: 3,
          changedNodeCount: 1,
          affectedNodeCount: 1,
          skippedNodeCount: 2,
          skipRatio: 2 / 3,
          reasons: [],
        },
        relevantSemanticNodeIds: [
          "function:pack:shop",
        ],
      });

    expect(
      pack.semantic.nodes.map(
        (node) => node.id,
      ),
    ).toContain(
      "function:pack:shop",
    );
  });

  it("rejects a budget smaller than explicitly required relationships", () => {
    expect(() =>
      compileContextPack({
        goal: "too-small-edge-budget",
        graph: fixtureGraph(),
        intent,
        relevantSemanticNodeIds: [
          "function:pack:arena",
        ],
        budget: {
          maxSemanticEdges: 1,
        },
      })
    ).not.toThrow();

    expect(() =>
      compileContextPack({
        goal: "too-small-node-budget",
        graph: fixtureGraph(),
        intent,
        relevantSemanticNodeIds: [
          "function:pack:arena",
          "function:pack:shop",
        ],
        budget: {
          maxSemanticNodes: 1,
        },
      })
    ).toThrow(
      /maxSemanticNodes/,
    );
  });

  it("marks the pack incomplete when explicitly requested ids are missing", () => {
    const pack =
      compileContextPack({
        goal: "missing",
        graph: fixtureGraph(),
        intent,
        relevantIntentSubjectIds: [
          "intent:missing",
        ],
        relevantEvidenceIds: [
          "e:missing",
        ],
      });

    expect(pack.complete)
      .toBe(false);
    expect(
      pack.missingRequested
        .semanticNodeIds,
    ).toEqual([]);
    expect(
      pack.missingRequested
        .intentSubjectIds,
    ).toEqual([
      "intent:missing",
    ]);
    expect(
      pack.missingRequested
        .evidenceIds,
    ).toEqual([
      "e:missing",
    ]);
  });

  it("rejects invalid context budgets", () => {
    expect(() =>
      compileContextPack({
        goal: "bad",
        graph: fixtureGraph(),
        intent,
        budget: {
          maxSemanticNodes: 0,
        },
      })
    ).toThrow(/positive integers/);
  });
});
