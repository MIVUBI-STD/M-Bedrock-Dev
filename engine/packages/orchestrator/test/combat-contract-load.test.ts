import { describe, expect, it } from "vitest";
import {
  parseCombatBehaviorContract,
} from "../src/combat-contract-load.js";

describe("combat contract loader", () => {
  it("requires every combat contract decision explicitly", () => {
    expect(
      parseCombatBehaviorContract({
        schemaVersion: 1,
        id: "arena-combat",
        friendlyFireAllowed: false,
        crossArenaDamageAllowed: false,
        secondaryEffectsRequireDamageEligibility: true,
        projectileGenerationBound: true,
        projectileCleanupOnGenerationEnd: true,
        environmentalDamageAllowed: true,
        reviveGenerationBound: true,
        selfReviveAllowed: false,
        multipleReviversAllowed: false,
        reviveAfterDeathAllowed: false,
      }),
    ).toMatchObject({
      id: "arena-combat",
      friendlyFireAllowed: false,
      reviveGenerationBound: true,
    });
  });

  it("rejects missing booleans instead of applying hidden defaults", () => {
    expect(() =>
      parseCombatBehaviorContract({
        schemaVersion: 1,
        id: "bad",
        friendlyFireAllowed: false,
      }),
    ).toThrow(/must be boolean/);
  });
});
