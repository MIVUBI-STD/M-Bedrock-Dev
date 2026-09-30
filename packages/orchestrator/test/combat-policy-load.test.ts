import { describe, expect, it } from "vitest";
import {
  parseCombatPolicy,
} from "../src/combat-policy-load.js";

describe("combat policy loader", () => {
  it("requires every combat policy decision explicitly", () => {
    expect(
      parseCombatPolicy({
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
      parseCombatPolicy({
        schemaVersion: 1,
        id: "bad",
        friendlyFireAllowed: false,
      }),
    ).toThrow(/must be boolean/);
  });
});
