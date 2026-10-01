import { describe, expect, it } from "vitest";
import {
  parseEconomyBehaviorContract,
} from "../../src/inspection/economy-contract-load.js";

describe("economy contract loader", () => {
  it("parses explicit reward transaction contract", () => {
    expect(
      parseEconomyBehaviorContract({
        schemaVersion: 1,
        id: "arena-economy",
        deathRewardArbitration:
          "mutually-exclusive",
        pickupCurrencyItemContract:
          "consume",
        inventoryFullContract:
          "compensate",
        rewardIdempotencyRequired: true,
        pickupScopeValidationRequired: true,
        staleDropCleanupRequired: true,
        terminalRewardRequiresResultCommit:
          true,
      }),
    ).toMatchObject({
      id: "arena-economy",
      deathRewardArbitration:
        "mutually-exclusive",
      pickupCurrencyItemContract:
        "consume",
    });
  });

  it("rejects enum typos rather than inventing defaults", () => {
    expect(() =>
      parseEconomyBehaviorContract({
        schemaVersion: 1,
        id: "invalid",
        deathRewardArbitration:
          "exclusive",
        pickupCurrencyItemContract:
          "consume",
        inventoryFullContract:
          "compensate",
        rewardIdempotencyRequired: true,
        pickupScopeValidationRequired: true,
        staleDropCleanupRequired: true,
        terminalRewardRequiresResultCommit:
          true,
      }),
    ).toThrow(/invalid value/);
  });
});
