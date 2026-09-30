import { describe, expect, it } from "vitest";
import {
  composeBehavioralWorldModel,
  createCombatLifecycleBehavior,
  resolveCombatDamageEligibility,
  validateBehavioralWorldModel,
} from "../src/index.js";

describe("combat lifecycle behavior", () => {
  it("composes downed, revive, death, and elimination as separate transitions", () => {
    const model = composeBehavioralWorldModel(
      "combat",
      [
        createCombatLifecycleBehavior({
          playerKey: "p1",
          reviverKey: "p2",
          reviveDeadlineTicks: 100,
        }),
      ],
    );

    expect(
      validateBehavioralWorldModel(model),
    ).toEqual([]);
    expect(
      model.transitions.map(
        (item) => item.id,
      ),
    ).toEqual(
      expect.arrayContaining([
        "minecraft.combat:p1:enter-downed",
        "minecraft.combat:p1:begin-revive",
        "minecraft.combat:p1:commit-revive",
        "minecraft.combat:p1:confirm-death",
        "minecraft.combat:p1:commit-elimination",
      ]),
    );
    expect(
      model.transitions.find(
        (item) =>
          item.id ===
          "minecraft.combat:p1:begin-revive",
      )?.effects,
    ).toEqual([
      expect.objectContaining({
        kind: "set",
        variableId: "combat.revive-owner",
        value: "p2",
      }),
    ]);
  });

  it("does not require attacker or projectile generations for allowed environmental damage", () => {
    const result =
      resolveCombatDamageEligibility(
        {
          schemaVersion: 1,
          id: "combat",
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
        },
        {
          attackerPresent: false,
          projectilePresent: false,
        },
      );

    expect(result.status).toBe("allow");
  });

  it("denies stale projectile generations only for projectile damage", () => {
    const policy = {
      schemaVersion: 1 as const,
      id: "combat",
      friendlyFireAllowed: true,
      crossArenaDamageAllowed: true,
      secondaryEffectsRequireDamageEligibility: true,
      projectileGenerationBound: true,
      projectileCleanupOnGenerationEnd: true,
      environmentalDamageAllowed: true,
      reviveGenerationBound: true,
      selfReviveAllowed: false,
      multipleReviversAllowed: false,
      reviveAfterDeathAllowed: false,
    };

    expect(
      resolveCombatDamageEligibility(
        policy,
        {
          attackerPresent: true,
          projectilePresent: true,
          sameArena: true,
          sameTeam: false,
          attackerGenerationCurrent: true,
          projectileGenerationCurrent: false,
        },
      ).status,
    ).toBe("deny");
  });
});
