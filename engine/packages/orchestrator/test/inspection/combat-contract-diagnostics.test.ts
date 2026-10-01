import { describe, expect, it } from "vitest";
import {
  combatContractDiagnostics,
} from "../../src/inspection/combat-contract-diagnostics.js";

describe("combat contract diagnostics", () => {
  it("emits no finding when authored combat contract has no observed contradiction", () => {
    expect(
      combatContractDiagnostics({
        configured: true,
        contractId: "mode",
        reviveContractContradictions: 0,
        selfReviveContradictions: 0,
        multipleReviverContradictions: 0,
        staleReviveContradictions: 0,
        reviveAfterDeathContradictions: 0,
        invalidReviverObservations: 0,
        projectileCleanupContractGap: 0,
        secondaryEffectEligibilitySurfaces: 0,
        reasons: [],
      }),
    ).toEqual([]);
  });

  it("projects runtime revive contradictions as one structured diagnostic", () => {
    const result =
      combatContractDiagnostics({
        configured: true,
        contractId: "mode",
        reviveContractContradictions: 3,
        selfReviveContradictions: 0,
        multipleReviverContradictions: 1,
        staleReviveContradictions: 1,
        reviveAfterDeathContradictions: 1,
        invalidReviverObservations: 0,
        projectileCleanupContractGap: 0,
        secondaryEffectEligibilitySurfaces: 0,
        reasons: [],
      });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      code:
        "COMBAT_REVIVE_CONTRACT_VIOLATION",
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
