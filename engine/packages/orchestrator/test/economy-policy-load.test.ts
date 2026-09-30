import { describe, expect, it } from "vitest";
import {
  parseEconomyPolicy,
} from "../src/economy-policy-load.js";

describe("economy policy loader", () => {
  it("parses explicit reward transaction policy", () => {
    expect(
      parseEconomyPolicy({
        schemaVersion: 1,
        id: "arena-economy",
        deathRewardArbitration:
          "mutually-exclusive",
        pickupCurrencyItemPolicy:
          "consume",
        inventoryFullPolicy:
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
      pickupCurrencyItemPolicy:
        "consume",
    });
  });

  it("rejects enum typos rather than inventing defaults", () => {
    expect(() =>
      parseEconomyPolicy({
        schemaVersion: 1,
        id: "invalid",
        deathRewardArbitration:
          "exclusive",
        pickupCurrencyItemPolicy:
          "consume",
        inventoryFullPolicy:
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
