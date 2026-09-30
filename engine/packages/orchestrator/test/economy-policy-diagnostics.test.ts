import { describe, expect, it } from "vitest";
import {
  economyPolicyDiagnostics,
} from "../src/economy-policy-diagnostics.js";

describe("economy policy diagnostics", () => {
  it("separates authored conflicts from coverage gaps", () => {
    const findings =
      economyPolicyDiagnostics({
        configured: true,
        policyId: "economy",
        deathRewardOverlapPolicyConflicts: 1,
        deathRewardOverlapUnresolved: 1,
        pickupCurrencyConsumeCoverageGaps: 0,
        pickupCurrencyPolicyMismatch: 0,
        idempotencyCoverageGaps: 1,
        staleDropCleanupCoverageGaps: 0,
        inventoryFullPolicyGaps: 0,
        pickupScopeValidationUnproven: 1,
        terminalRewardResultCommitUnproven: 0,
        reasons: [],
      });

    expect(
      findings.map((item) => item.code),
    ).toEqual([
      "ECONOMY_POLICY_CONFLICT",
      "ECONOMY_POLICY_COVERAGE_GAP",
    ]);
    expect(findings[0]?.severity)
      .toBe("medium");
    expect(findings[1]?.severity)
      .toBe("minor");
  });

  it("emits nothing when no authored economy policy is configured", () => {
    expect(
      economyPolicyDiagnostics({
        configured: false,
        deathRewardOverlapPolicyConflicts: 0,
        deathRewardOverlapUnresolved: 1,
        pickupCurrencyConsumeCoverageGaps: 0,
        pickupCurrencyPolicyMismatch: 0,
        idempotencyCoverageGaps: 0,
        staleDropCleanupCoverageGaps: 0,
        inventoryFullPolicyGaps: 0,
        pickupScopeValidationUnproven: 0,
        terminalRewardResultCommitUnproven: 0,
        reasons: [],
      }),
    ).toEqual([]);
  });
});
