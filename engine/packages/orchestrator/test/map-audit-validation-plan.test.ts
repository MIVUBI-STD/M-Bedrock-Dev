import { describe, expect, it } from "vitest";
import { groupNeedValidationTests } from "../src/map-audit-validation-plan.js";

describe("map audit validation plan", () => {
  it("keeps runtime verification narrow and explicitly forbids broad playthrough", () => {
    const groups = groupNeedValidationTests([
      {
        status: "NEED_VALIDATION",
        issueType: "BUG",
        failureDomain: "ui-feedback-information",
        contributingDomains: ["ui-feedback-information"],
        gameplayFlow: "ACTIVE_GAMEPLAY",
        informationMismatch: true,
        playerFacingEvidenceIds: [],
        causalLinkId: "link:client-reconcile",
        scenarioId: "scenario:client-reconcile",
        gameplayStage: "ACTIVE_GAMEPLAY",
        scenarioLabel: "client-server-reconciliation",
        gameplayTrigger: "Cancel one predicted block interaction.",
        gameplayConsequence: "The acting client may retain stale visual state.",
        expectedOutcome: "All clients converge to authoritative state.",
        actualOutcome: "Client reconciliation remains the deciding native fact.",
        affectedScope: "acting client",
        subjectIds: [],
        componentIds: ["runtime:client-reconciliation"],
        evidenceIds: [],
        validationReason: "Native client reconciliation is not statically decidable.",
        missingProof: "One acting-client versus observer-client comparison.",
        validationTest: "Cancel one water placement and compare Client A with Client B.",
        validationGroupKey: "client-reconciliation:water",
        proofNavigation: {
          recipeId: "proof:client-reconciliation",
          proofGoal: "Decide one native client reconciliation fact.",
          provenClaims: [],
          missingClaims: ["client-reconciles"],
          route: [],
          evidenceSubstitutions: [],
          historicalSearchHints: [],
          historyPressure: 0,
          familyProofCriteria: [],
          proofStopRule: "Stop after the deciding observation.",
          runtimeLastResort: true,
        },
      } as any,
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      verificationMode: "NARROW_RUNTIME_VERIFICATION",
      broadPlaythroughAllowed: false,
      test: "Cancel one water placement and compare Client A with Client B.",
    });
  });

  it("keeps static proof work out of runtime mode", () => {
    const groups = groupNeedValidationTests([
      {
        status: "NEED_VALIDATION",
        causalLinkId: "link:static",
        validationGroupKey: "static:proof",
        validationTest: "Resolve the exact owner from selected-artifact evidence.",
        missingProof: "Owner proof.",
        issueType: "BUG",
        gameplayFlow: "PROVE",
      } as any,
    ]);

    expect(groups[0]?.verificationMode).toBe(
      "STATIC_PROOF_COMPLETION",
    );
    expect(groups[0]?.broadPlaythroughAllowed).toBe(false);
  });
});
