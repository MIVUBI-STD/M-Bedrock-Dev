import { describe, expect, it } from "vitest";
import type {
  EngineeringReviewProjection,
} from "../../../packages/orchestrator/src/index.js";
import {
  buildReviewUiViewModel,
} from "../src/view-model.js";

function projectionFixture(): EngineeringReviewProjection {
  return {
    schemaVersion: 1,
    artifact: {
      id: "art:demo",
      fingerprint: "f".repeat(64),
      archiveEntries: 3,
      target: {
        edition: "bedrock",
        version: "1.26.32",
      },
    },
    understanding: {
      nodes: 1,
      authoredNodes: 1,
      inferredNodes: 0,
      hypothesisNodes: 0,
      invariants: 1,
      unknowns: [],
    },
    runtimeClassifications: {
      "confirmed-defect": 0,
      "probable-defect": 1,
      "designed-behavior": 1,
      "engine-constraint": 0,
      "compatibility-difference": 0,
      "insufficient-evidence": 0,
      "ambiguous-intent": 0,
      "runtime-proof-required": 1,
    },
    runtimeAssessments: [
      {
        id: "runtime:outcome:reconnect:ev:1",
        outcomeId: "outcome:reconnect",
        disposition: "runtime-proof-required",
        subjectIds: ["session"],
        basisInvariantIds: [],
        evidenceIds: ["ev:1"],
        nextEvidenceNeed: "runtime-proof",
        reasons: ["Runtime proof is required."],
      },
      {
        id: "runtime:outcome:score:ev:2",
        outcomeId: "outcome:score",
        disposition: "designed-behavior",
        subjectIds: ["score"],
        basisInvariantIds: [],
        evidenceIds: ["ev:2"],
        nextEvidenceNeed: "none",
        reasons: ["Observed behavior matches design."],
      },
      {
        id: "runtime:outcome:cleanup:ev:3",
        outcomeId: "outcome:cleanup",
        disposition: "probable-defect",
        subjectIds: ["cleanup"],
        basisInvariantIds: ["inv:cleanup"],
        evidenceIds: ["ev:3"],
        nextEvidenceNeed: "authored-intent",
        reasons: ["Observed evidence contradicts inferred intent."],
      },
    ],
    attention: [],
    diagnosticDefinitions: [{
      code: "CROSS_SCOPE_STATE_RISK",
      title: "Cross Scope State Risk",
      category: "state",
      evidenceBoundary: "static",
      severityAuthority: "finding",
    }],
    diagnostics: [{
      id: "diag:1",
      code: "CROSS_SCOPE_STATE_RISK",
      severity: "critical",
      message: "State can cross scope boundaries.",
      relatedNodeIds: [],
    }],
    incidents: [],
    repairCandidates: [],
    evidenceRecovery: {
      required: false,
      actions: [],
      blocksCurrentStateClaims: false,
      blocksTemporalClaims: false,
      blocksFullRepairAuthorization: false,
    },
    decisionBasis: {},
    invalidation: {
      items: [{
        id: "validation:1",
        source: "validation",
        category: "validation-artifact-changed",
        summary: "The artifact changed after this validation run.",
        reason: "artifact fingerprint changed since this validation run",
        nextAction: "rerun-validation",
        blocking: true,
        validationRunId: "run:1",
      }],
      invalidatedDecisionCount: 0,
      supersededDecisionCount: 0,
      staleValidationRunCount: 1,
      blockingCount: 1,
    },
    priority: {
      order: [
        "blocking-proof",
        "confirmed-defect",
        "critical-diagnostic",
        "evidence-required",
        "probable-defect",
        "repair-follow-up",
      ],
      items: [],
      hasBlockingProofGap: true,
      hasConfirmedDefect: false,
      hasCriticalDiagnostic: true,
    },
  };
}

describe("review UI view model", () => {
  it("uses canonical priority order without promoting critical diagnostics to confirmed defects", () => {
    const model = buildReviewUiViewModel(
      projectionFixture(),
    );

    expect(model.attentionCount).toBe(4);
    expect(model.items.map((item) => item.state)).toEqual([
      "outdated-proof",
      "critical-diagnostic",
      "runtime-test-required",
      "probable-defect",
      "designed-behavior",
    ]);
    expect(
      model.items.find((item) =>
        item.state === "critical-diagnostic"
      )?.stateLabel,
    ).toBe("Critical diagnostic");
  });

  it("keeps designed behavior in the understood section", () => {
    const model = buildReviewUiViewModel(
      projectionFixture(),
    );
    const designed = model.items.find(
      (item) => item.state === "designed-behavior",
    );

    expect(designed?.section).toBe("understood");
    expect(designed?.nextAction).toBeUndefined();
  });

  it("turns stale proof into plain-language next action without changing the raw reason", () => {
    const model = buildReviewUiViewModel(
      projectionFixture(),
    );
    const stale = model.items[0];

    expect(stale).toMatchObject({
      state: "outdated-proof",
      nextAction: "Re-run validation",
    });
    expect(stale?.technical?.rawReason).toMatch(
      /artifact fingerprint changed/,
    );
  });
});
