import { describe, expect, it } from "vitest";
import {
  buildAuditProofNavigation,
} from "../src/map-audit-proof-navigation.js";
import type {
  NeedValidationAuditIssueProjection,
} from "../src/map-audit-issue-projection.js";

function finding(
  failureDomain: NeedValidationAuditIssueProjection["failureDomain"],
): NeedValidationAuditIssueProjection {
  return {
    status: "NEED_VALIDATION",
    issueType: "BUG",
    failureDomain,
    contributingDomains: [failureDomain],
    gameplayFlow: "PROGRESSION",
    informationMismatch: false,
    playerFacingEvidenceIds: [],
    causalLinkId: "link:test",
    scenarioId: "scenario:test",
    gameplayStage: "PROGRESSION",
    scenarioLabel: "wave-progression",
    gameplayTrigger: "Run the wave.",
    gameplayConsequence: "Progression may block.",
    expectedOutcome: "Wave must complete.",
    actualOutcome: "Completion remains unresolved.",
    affectedScope: "objective:test",
    subjectIds: ["objective:test"],
    componentIds: ["runtime:entities"],
    evidenceIds: ["e:test"],
    validationReason: "Proof is incomplete.",
    missingProof: "Reachable completion accounting.",
    validationTest: "Run the exact unresolved transition.",
    validationGroupKey: "scenario:test:progression",
  };
}

describe("map audit proof navigation", () => {
  it("routes progression findings through static/cross-domain proof before runtime", () => {
    const result = buildAuditProofNavigation(
      finding("progression-wave-objective"),
    );

    expect(result.recipeId).toBe(
      "proof:progression-dead-end",
    );
    expect(result.route[0]?.knowledgeDomain).toBe(
      "state-flow",
    );
    expect(result.route.at(-1)?.evidencePreference).toBe(
      "runtime",
    );
    expect(result.runtimeLastResort).toBe(true);
    expect(result.missingClaims).toEqual([
      "Reachable completion accounting.",
    ]);
  });

  it("does not label unevidenced expected/actual narrative as proven claims", () => {
    const item = {
      ...finding("inventory-economy"),
      evidenceIds: [],
    };
    const result =
      buildAuditProofNavigation(item);

    expect(result.provenClaims).toEqual([]);
  });
});
