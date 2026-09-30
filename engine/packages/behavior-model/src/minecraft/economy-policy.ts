import {
  projectPolicyProvenance,
} from "../provenance.js";
import type {
  BehaviorClaimProvenance,
} from "../provenance.js";

export type DeathRewardArbitration =
  | "complementary"
  | "mutually-exclusive"
  | "unresolved";

export type PickupCurrencyItemPolicy =
  | "consume"
  | "retain"
  | "not-applicable";

export type InventoryFullRewardPolicy =
  | "leave-remainder"
  | "defer"
  | "convert"
  | "reject"
  | "compensate"
  | "not-applicable";

export interface EconomyBehaviorContract {
  schemaVersion: 1;
  id: string;
  deathRewardArbitration:
    DeathRewardArbitration;
  pickupCurrencyItemPolicy:
    PickupCurrencyItemPolicy;
  inventoryFullPolicy:
    InventoryFullRewardPolicy;
  rewardIdempotencyRequired: boolean;
  pickupScopeValidationRequired: boolean;
  staleDropCleanupRequired: boolean;
  terminalRewardRequiresResultCommit: boolean;
  provenance?: BehaviorClaimProvenance;
}

/** @deprecated Compatibility alias. Use EconomyBehaviorContract. */
export type EconomyPolicy = EconomyBehaviorContract;

const provenance = projectPolicyProvenance(
  "behavior-spec:economy-policy-v1",
  "Reward source arbitration, pickup conversion, stale-drop cleanup, and inventory-full behavior are authored gameplay policy.",
);

export function economyPolicyProvenance(): BehaviorClaimProvenance {
  return provenance;
}

export function validateEconomyPolicy(
  policy: EconomyPolicy,
): string[] {
  const errors: string[] = [];

  if (policy.schemaVersion !== 1) {
    errors.push(
      "Economy policy schemaVersion must be 1.",
    );
  }
  if (!policy.id.trim()) {
    errors.push(
      "Economy policy id must be non-empty.",
    );
  }

  return errors;
}

export const validateEconomyBehaviorContract = validateEconomyPolicy;
