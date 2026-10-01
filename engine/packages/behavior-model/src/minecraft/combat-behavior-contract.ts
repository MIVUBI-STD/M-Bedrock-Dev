import {
  projectPolicyProvenance,
} from "../provenance.js";
import type {
  BehaviorClaimProvenance,
} from "../provenance.js";

export interface CombatBehaviorContract {
  schemaVersion: 1;
  id: string;
  friendlyFireAllowed: boolean;
  crossArenaDamageAllowed: boolean;
  secondaryEffectsRequireDamageEligibility: boolean;
  projectileGenerationBound: boolean;
  projectileCleanupOnGenerationEnd: boolean;
  environmentalDamageAllowed: boolean;
  reviveGenerationBound: boolean;
  selfReviveAllowed: boolean;
  multipleReviversAllowed: boolean;
  reviveAfterDeathAllowed: boolean;
  provenance?: BehaviorClaimProvenance;
}

/** @deprecated Compatibility alias. Use CombatBehaviorContract. */
export type CombatPolicy = CombatBehaviorContract;

export interface CombatDamageEligibilityQuery {
  attackerPresent?: boolean;
  projectilePresent?: boolean;
  sameArena?: boolean;
  sameTeam?: boolean;
  attackerGenerationCurrent?: boolean;
  projectileGenerationCurrent?: boolean;
}

export interface CombatDamageEligibilityResolution {
  status: "allow" | "deny" | "unknown";
  reasons: readonly string[];
}

const provenance = projectPolicyProvenance(
  "behavior-spec:combat-policy-v1",
  "Combat eligibility and revive ownership are project-authored policy. Engine damage observations alone do not establish gameplay eligibility.",
);

export function combatBehaviorContractProvenance(): BehaviorClaimProvenance {
  return provenance;
}

export function validateCombatBehaviorContract(
  policy: CombatPolicy,
): string[] {
  const errors: string[] = [];

  if (policy.schemaVersion !== 1) {
    errors.push(
      "Combat policy schemaVersion must be 1.",
    );
  }
  if (!policy.id.trim()) {
    errors.push(
      "Combat policy id must be non-empty.",
    );
  }
  return errors;
}

export function resolveCombatDamageEligibility(
  policy: CombatPolicy,
  query: CombatDamageEligibilityQuery,
): CombatDamageEligibilityResolution {
  const errors = validateCombatBehaviorContract(policy);
  if (errors.length > 0) {
    return {
      status: "unknown",
      reasons: errors,
    };
  }

  if (
    query.attackerPresent === false &&
    query.projectilePresent !== true
  ) {
    return {
      status: policy.environmentalDamageAllowed
        ? "allow"
        : "deny",
      reasons: [
        policy.environmentalDamageAllowed
          ? "Authored policy allows environmental/unattributed damage."
          : "Authored policy denies environmental/unattributed damage.",
      ],
    };
  }

  if (
    query.attackerPresent === undefined &&
    query.projectilePresent === undefined
  ) {
    return {
      status: "unknown",
      reasons: [
        "Damage attribution presence is unresolved.",
      ],
    };
  }

  if (
    policy.crossArenaDamageAllowed === false
  ) {
    if (query.sameArena === false) {
      return {
        status: "deny",
        reasons: [
          "Authored combat policy denies cross-arena damage.",
        ],
      };
    }
    if (query.sameArena === undefined) {
      return {
        status: "unknown",
        reasons: [
          "Arena relationship is unresolved.",
        ],
      };
    }
  }

  if (
    policy.friendlyFireAllowed === false
  ) {
    if (query.sameTeam === true) {
      return {
        status: "deny",
        reasons: [
          "Authored combat policy denies same-team damage.",
        ],
      };
    }
    if (query.sameTeam === undefined) {
      return {
        status: "unknown",
        reasons: [
          "Team relationship is unresolved.",
        ],
      };
    }
  }

  if (query.attackerPresent === true) {
    if (
      query.attackerGenerationCurrent === false
    ) {
      return {
        status: "deny",
        reasons: [
          "Attacker generation is stale.",
        ],
      };
    }
    if (
      query.attackerGenerationCurrent ===
      undefined
    ) {
      return {
        status: "unknown",
        reasons: [
          "Attacker generation freshness is unresolved.",
        ],
      };
    }
  }

  if (
    policy.projectileGenerationBound &&
    query.projectilePresent === true
  ) {
    if (
      query.projectileGenerationCurrent === false
    ) {
      return {
        status: "deny",
        reasons: [
          "Projectile generation is stale.",
        ],
      };
    }
    if (
      query.projectileGenerationCurrent ===
      undefined
    ) {
      return {
        status: "unknown",
        reasons: [
          "Projectile generation freshness is unresolved.",
        ],
      };
    }
  }

  return {
    status: "allow",
    reasons: [
      "All required authored combat eligibility conditions are satisfied by the supplied runtime facts.",
    ],
  };
}

export function combatSecondaryEffectAllowed(
  policy: CombatPolicy,
  damageEligibility:
    CombatDamageEligibilityResolution,
): CombatDamageEligibilityResolution {
  if (
    !policy.secondaryEffectsRequireDamageEligibility
  ) {
    return {
      status: "allow",
      reasons: [
        "Authored policy allows secondary effects independently from damage eligibility.",
      ],
    };
  }
  return damageEligibility;
}

export const validateCombatBehaviorContract = validateCombatBehaviorContract;

/** @deprecated Use combatBehaviorContractProvenance. */
export const combatPolicyProvenance = combatBehaviorContractProvenance;
/** @deprecated Use validateCombatBehaviorContract. */
export const validateCombatPolicy = validateCombatBehaviorContract;
