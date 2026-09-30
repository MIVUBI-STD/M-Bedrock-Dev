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
  authorization: {
    schemaVersion: 1,
    authorized: true,
    sourceFingerprint: "fp",
    diagnosisEvidenceIds: ["e:authorization"],
    invariantIds: ["inv:arena"],
    evidenceFreshness: "fresh",
  },
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
        postPatchGraph: graph,
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
          availableEvidenceIds: [
            "e:shop",
          ],
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

  it("retains changed semantic nodes as required context even when optional context is budget-limited", () => {
    const graph =
      graphFixture();

    const plan =
      prepareZeroWasteWorkflow({
        goal: "repair arena",
        graph,
        postPatchGraph: graph,
        intent,
        transaction,
        validationScenarios: [],
        validationBindings: [],
        contextBudget: {
          maxSemanticNodes: 1,
        },
      });

    expect(plan.context.complete)
      .toBe(true);
    expect(
      plan.context.semantic.nodes.map(
        (node) => node.id,
      ),
    ).toContain(
      "function:pack:arena",
    );
  });

  it("rejects runtime proof reuse across arena generations", () => {
    const graph = graphFixture();
    const runtimeProof =
      createSemanticProofClaim({
        claimId: "claim:arena:g4",
        claimRevision: "1",
        kind: "runtime",
        graph,
        basisNodeIds: ["function:pack:arena"],
        evidenceIds: ["runtime:arena:g4"],
        targetProfileFingerprint: "runtime-a",
        runtimeScope: {
          arenaId: "arena-2",
          arenaGeneration: 4,
        },
      });

    const plan = prepareZeroWasteWorkflow({
      goal: "repair arena",
      graph,
      postPatchGraph: graph,
      intent,
      transaction,
      validationScenarios: [],
      validationBindings: [],
      proofClaims: [{
        claim: runtimeProof,
        claimRevision: "1",
        availableEvidenceIds: ["runtime:arena:g4"],
        targetProfileFingerprint: "runtime-a",
        runtimeScope: {
          arenaId: "arena-2",
          arenaGeneration: 5,
        },
      }],
    });

    expect(plan.staleProofClaimIds).toEqual([
      "claim:arena:g4",
    ]);
    expect(plan.reusableProofClaimIds).toEqual([]);
    expect(plan.proofActions).toEqual([
      expect.objectContaining({
        claimId: "claim:arena:g4",
        action: "recompute",
      }),
    ]);
  });

  it("rejects explicitly stale evidence from zero-waste reuse", () => {
    const graph = graphFixture();
    const proof =
      createSemanticProofClaim({
        claimId: "claim:arena:stale",
        claimRevision: "1",
        kind: "static",
        graph,
        basisNodeIds: ["function:pack:arena"],
        evidenceIds: ["e:arena:old"],
      });

    const plan = prepareZeroWasteWorkflow({
      goal: "repair arena",
      graph,
      postPatchGraph: graph,
      intent,
      transaction,
      validationScenarios: [],
      validationBindings: [],
      proofClaims: [{
        claim: proof,
        claimRevision: "1",
        availableEvidenceIds: ["e:arena:old"],
        staleEvidenceIds: ["e:arena:old"],
      }],
    });

    expect(plan.staleProofClaimIds).toEqual([
      "claim:arena:stale",
    ]);
  });

  it("falls back to conservative validation and blocks proof reuse without a post-patch graph", () => {
    const graph =
      graphFixture();
    const shopProof =
      createSemanticProofClaim({
        claimId:
          "claim:shop:no-post",
        claimRevision: "1",
        kind: "static",
        graph,
        basisNodeIds: [
          "function:pack:shop",
        ],
        evidenceIds: [
          "e:shop",
        ],
      });

    const plan =
      prepareZeroWasteWorkflow({
        goal: "pre-patch only",
        graph,
        intent,
        transaction,
        validationScenarios: [{
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
            "scenario:shop",
          semanticNodeIds: [
            "function:pack:shop",
          ],
        }],
        proofClaims: [{
          claim: shopProof,
          claimRevision: "1",
          availableEvidenceIds: [
            "e:shop",
          ],
        }],
      });

    expect(
      plan.impactAuthority,
    ).toBe(
      "pre-patch-conservative",
    );
    expect(
      plan.validation
        .selectedScenarioCount,
    ).toBe(1);
    expect(
      plan.validation
        .skippedScenarioCount,
    ).toBe(0);
    expect(
      plan.blockedProofClaimIds,
    ).toEqual([
      "claim:shop:no-post",
    ]);
  });

  it("does not report ready when the bounded context is incomplete", () => {
    const plan =
      prepareZeroWasteWorkflow({
        goal: "repair arena",
        graph: graphFixture(),
        postPatchGraph:
          graphFixture(),
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
