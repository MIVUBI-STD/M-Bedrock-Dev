import {
  projectPolicyProvenance,
} from "../provenance.js";
import type {
  BehaviorClaimProvenance,
} from "../provenance.js";

export interface CombatPolicy {
  schemaVersion: 1;
  id: string;
  friendlyFireAllowed: boolean;
  crossArenaDamageAllowed: boolean;
  secondaryEffectsRequireDamageEligibility: boolean;
  projectileGenerationBound: boolean;
  projectileCleanupOnGenerationEnd: boolean;
  selfReviveAllowed: boolean;
  multipleReviversAllowed: boolean;
  reviveAfterDeathAllowed: boolean;
  provenance?: BehaviorClaimProvenance;
}

export interface CombatDamageEligibilityQuery {
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

export function combatPolicyProvenance(): BehaviorClaimProvenance {
  return provenance;
}

export function validateCombatPolicy(
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
  const errors = validateCombatPolicy(policy);
  if (errors.length > 0) {
    return {
      status: "unknown",
      reasons: errors,
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
    query.attackerGenerationCurrent === undefined
  ) {
    return {
      status: "unknown",
      reasons: [
        "Attacker generation freshness is unresolved.",
      ],
    };
  }

  if (policy.projectileGenerationBound) {
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
