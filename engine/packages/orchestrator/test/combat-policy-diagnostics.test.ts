import { describe, expect, it } from "vitest";
import {
  combatPolicyDiagnostics,
} from "../src/combat-policy-diagnostics.js";

describe("combat policy diagnostics", () => {
  it("emits no finding when authored combat policy has no observed contradiction", () => {
    expect(
      combatPolicyDiagnostics({
        configured: true,
        policyId: "mode",
        revivePolicyContradictions: 0,
        selfReviveContradictions: 0,
        multipleReviverContradictions: 0,
        staleReviveContradictions: 0,
        reviveAfterDeathContradictions: 0,
        invalidReviverObservations: 0,
        projectileCleanupPolicyGap: 0,
        secondaryEffectEligibilitySurfaces: 0,
        reasons: [],
      }),
    ).toEqual([]);
  });

  it("projects runtime revive contradictions as one structured diagnostic", () => {
    const result =
      combatPolicyDiagnostics({
        configured: true,
        policyId: "mode",
        revivePolicyContradictions: 3,
        selfReviveContradictions: 0,
        multipleReviverContradictions: 1,
        staleReviveContradictions: 1,
        reviveAfterDeathContradictions: 1,
        invalidReviverObservations: 0,
        projectileCleanupPolicyGap: 0,
        secondaryEffectEligibilitySurfaces: 0,
        reasons: [],
      });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      code:
        "COMBAT_REVIVE_POLICY_VIOLATION",
      severity: "medium",
      data: {
        selfRevive: 0,
        multipleRevivers: 1,
        staleRevive: 1,
        reviveAfterDeath: 1,
        invalidReviverObservations: 0,
      },
    });
  });
});
