import { describe, expect, it } from "vitest";
import {
  economyContractDiagnostics,
} from "../src/economy-contract-diagnostics.js";

describe("economy contract diagnostics", () => {
  it("separates authored conflicts from coverage gaps", () => {
    const findings =
      economyContractDiagnostics({
        configured: true,
        contractId: "economy",
        deathRewardOverlapContractConflicts: 1,
        deathRewardOverlapUnresolved: 1,
        pickupCurrencyConsumeCoverageGaps: 0,
        pickupCurrencyContractMismatch: 0,
        idempotencyCoverageGaps: 1,
        staleDropCleanupCoverageGaps: 0,
        inventoryFullContractGaps: 0,
        pickupScopeValidationUnproven: 1,
        terminalRewardResultCommitUnproven: 0,
        reasons: [],
      });

    expect(
      findings.map((item) => item.code),
    ).toEqual([
      "ECONOMY_CONTRACT_CONFLICT",
      "ECONOMY_CONTRACT_COVERAGE_GAP",
    ]);
    expect(findings[0]?.severity)
      .toBe("medium");
    expect(findings[1]?.severity)
      .toBe("minor");
  });

  it("emits nothing when no authored economy contract is configured", () => {
    expect(
      economyContractDiagnostics({
        configured: false,
        deathRewardOverlapContractConflicts: 0,
        deathRewardOverlapUnresolved: 1,
        pickupCurrencyConsumeCoverageGaps: 0,
        pickupCurrencyContractMismatch: 0,
        idempotencyCoverageGaps: 0,
        staleDropCleanupCoverageGaps: 0,
        inventoryFullContractGaps: 0,
        pickupScopeValidationUnproven: 0,
        terminalRewardResultCommitUnproven: 0,
        reasons: [],
      }),
    ).toEqual([]);
  });
});
