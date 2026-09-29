import {
  describe,
  expect,
  it,
} from "vitest";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import {
  SemanticGraph,
} from "../../graph/src/index.js";
import type {
  PatchTransaction,
} from "../../repair/src/index.js";
import {
  createSemanticProofClaim,
  prepareZeroWasteWorkflow,
  zeroWasteWorkflowPlanText,
} from "../src/index.js";

function graphFixture() {
  const graph =
    new SemanticGraph();

  for (const id of [
    "arena",
    "shop",
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
      contentHash:
        id + "-v1",
    });
  }

  return graph;
}

const intent: GameplayIntentModel = {
  schemaVersion: 1,
  id: "intent",
  evidence: [],
  nodes: [],
  edges: [],
  invariants: [],
  unknowns: [],
};

const transaction:
  PatchTransaction = {
  id: "patch",
  title: "arena fix",
  sourceFingerprint: "fp",
  operations: [{
    kind: "replace-command",
    source: {
      artifactId: "map",
      relativePath:
        "functions/arena.mcfunction",
    },
    expected: "old",
    replacement: "new",
  }],
  preconditions: [],
  validation: [],
  affectedPaths: [
    "functions/arena.mcfunction",
  ],
};

describe("zero-waste workflow facade", () => {
  it("composes impact, selective validation, context, and proof reuse without duplicating their authority", () => {
    const graph =
      graphFixture();
    const shopProof =
      createSemanticProofClaim({
        claimId: "claim:shop",
        claimRevision: "1",
        kind: "static",
        graph,
        basisNodeIds: [
          "function:pack:shop",
        ],
        evidenceIds: ["e:shop"],
      });

    const plan =
      prepareZeroWasteWorkflow({
        goal: "repair arena",
        graph,
        intent,
        transaction,
        validationScenarios: [{
          schemaVersion: 1,
          id: "scenario:arena",
          revision: "1",
          title: "arena",
          intentInvariantIds: [],
          steps: [{
            kind: "rebuild-graph",
          }],
          requiredProofLevel:
            "STATIC VERIFIED",
        }, {
          schemaVersion: 1,
          id: "scenario:shop",
          revision: "1",
          title: "shop",
          intentInvariantIds: [],
          steps: [{
            kind: "rebuild-graph",
          }],
          requiredProofLevel:
            "STATIC VERIFIED",
        }],
        validationBindings: [{
          scenarioId:
            "scenario:arena",
          semanticNodeIds: [
            "function:pack:arena",
          ],
        }, {
          scenarioId:
            "scenario:shop",
          semanticNodeIds: [
            "function:pack:shop",
          ],
        }],
        proofClaims: [{
          claim: shopProof,
          claimRevision: "1",
        }],
      });

    expect(plan.status)
      .toBe("ready");
    expect(
      plan.validation
        .selectedScenarioCount,
    ).toBe(1);
    expect(
      plan.validation
        .skippedScenarioCount,
    ).toBe(1);
    expect(
      plan.reusableProofClaimIds,
    ).toEqual([
      "claim:shop",
    ]);

    const text =
      zeroWasteWorkflowPlanText(
        plan,
      );
    expect(text)
      .toContain("Status: ready");
    expect(text)
      .toContain("- reusable: 1");
  });

  it("does not report ready when the bounded context is incomplete", () => {
    const plan =
      prepareZeroWasteWorkflow({
        goal: "repair arena",
        graph: graphFixture(),
        intent: {
          ...intent,
          nodes: [{
            id: "intent:arena",
            kind: "mechanic",
            label: "Arena",
            status: "authored",
            evidenceIds: [],
          }, {
            id: "intent:shop",
            kind: "mechanic",
            label: "Shop",
            status: "authored",
            evidenceIds: [],
          }],
        },
        transaction,
        validationScenarios: [],
        validationBindings: [],
        contextBudget: {
          maxIntentNodes: 1,
        },
      });

    expect(plan.status)
      .toBe(
        "needs-context-expansion",
      );
    expect(plan.context.complete)
      .toBe(false);
  });
});
