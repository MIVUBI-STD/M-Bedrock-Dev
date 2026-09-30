import { describe, expect, it } from "vitest";
import type {
  ZeroWasteWorkflowPlan,
} from "../src/zero-waste-workflow.js";
import {
  createZeroWasteExecutionReceipt,
} from "../src/zero-waste-execution-receipt.js";

const plan: ZeroWasteWorkflowPlan = {
  impactAuthority: "post-patch",
  status: "ready",
  affected: {
    status: "planned",
    changedNodeIds: [],
    affectedNodeIds: [],
    skippedNodeIds: [],
    affectedPaths: [],
    knownPaths: [],
    totalNodeCount: 0,
    changedNodeCount: 0,
    affectedNodeCount: 0,
    skippedNodeCount: 0,
    skipRatio: 0,
    reasons: [],
  },
  context: {
    schemaVersion: 1,
    goal: "test",
    semantic: { nodes: [], edges: [], omitted: 0, omittedEdges: 0 },
    intent: { nodes: [], invariants: [], unknowns: [], evidence: [] },
    budget: {
      maxSemanticNodes: 0,
      maxSemanticEdges: 0,
      maxIntentNodes: 0,
      maxInvariants: 0,
      maxUnknowns: 0,
      maxEvidence: 0,
    },
    truncation: {
      semanticNodes: 0,
      semanticEdges: 0,
      intentNodes: 0,
      invariants: 0,
      unknowns: 0,
      evidence: 0,
    },
    missingRequested: {
      semanticNodeIds: [],
      intentSubjectIds: [],
      invariantIds: [],
      evidenceIds: [],
    },
    complete: true,
    reasons: [],
  },
  validation: {
    status: "planned",
    selected: [{
      scenarioId: "scenario:a",
      title: "A",
      reason: "always-run",
      detail: "required",
    }],
    skipped: [{
      scenarioId: "scenario:b",
      title: "B",
      reason: "outside-affected-closure",
      detail: "unaffected",
    }],
    totalScenarioCount: 2,
    selectedScenarioCount: 1,
    skippedScenarioCount: 1,
    skipRatio: 0.5,
    affectedNodeCount: 0,
    affectedPathCount: 0,
    reasons: [],
    errors: [],
  },
  proofReuse: [],
  reusableProofClaimIds: ["claim:a"],
  staleProofClaimIds: ["claim:b"],
  blockedProofClaimIds: [],
  proofActions: [
    { claimId: "claim:a", action: "reuse", dependsOnClaimIds: [], reasons: [] },
    { claimId: "claim:b", action: "recompute", dependsOnClaimIds: [], reasons: [] },
  ],
  reasons: [],
};

describe("zero-waste execution receipt", () => {
  it("records completed proof routing and validation selection", () => {
    const receipt = createZeroWasteExecutionReceipt(
      plan,
      [
        {
          claimId: "claim:a",
          action: "reuse",
          completed: true,
          evidenceIds: ["e:a"],
        },
        {
          claimId: "claim:b",
          action: "recompute",
          completed: true,
          evidenceIds: ["e:b"],
        },
      ],
    );

    expect(receipt.status).toBe("complete");
    expect(receipt.skippedValidationScenarioIds).toEqual([
      "scenario:b",
    ]);
    expect(receipt.evidenceIds).toEqual([
      "e:a",
      "e:b",
    ]);
    expect(receipt.avoidedWork).toEqual({
      proofExecutions: 1,
      validationScenarios: 1,
      totalUnits: 2,
      it("rejects outcomes that violate proof dependency order", () => {
    const dependentPlan: ZeroWasteWorkflowPlan = {
      ...plan,
      proofActions: [
        {
          claimId: "claim:dependency",
          action: "recompute",
          dependsOnClaimIds: [],
          reasons: [],
        },
        {
          claimId: "claim:consumer",
          action: "recompute",
          dependsOnClaimIds: ["claim:dependency"],
          reasons: [],
        },
      ],
      reusableProofClaimIds: [],
      staleProofClaimIds: [
        "claim:dependency",
        "claim:consumer",
      ],
    };

    const receipt = createZeroWasteExecutionReceipt(
      dependentPlan,
      [
        {
          claimId: "claim:consumer",
          action: "recompute",
          completed: true,
          evidenceIds: ["e:consumer"],
        },
        {
          claimId: "claim:dependency",
          action: "recompute",
          completed: true,
          evidenceIds: ["e:dependency"],
        },
      ],
    );

    expect(receipt.status).toBe("incomplete");
    expect(receipt.dependencyViolations.join(" ")).toMatch(
      /before dependency/i,
    );
  });
});
  });
});
