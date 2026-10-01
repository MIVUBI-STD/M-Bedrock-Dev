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
  "behavior-spec:economy-behavior-contract-v1",
  "Reward source arbitration, pickup conversion, stale-drop cleanup, and inventory-full behavior are authored gameplay contract.",
);

export function economyBehaviorContractProvenance(): BehaviorClaimProvenance {
  return provenance;
}

export function validateEconomyBehaviorContract(
  contract: EconomyBehaviorContract,
): string[] {
  const errors: string[] = [];

  if (contract.schemaVersion !== 1) {
    errors.push(
      "Economy Behavior Contract schemaVersion must be 1.",
    );
  }
  if (!contract.id.trim()) {
    errors.push(
      "Economy Behavior Contract id must be non-empty.",
    );
  }

  return errors;
}


/** @deprecated Use economyBehaviorContractProvenance. */
export const economyPolicyProvenance = economyBehaviorContractProvenance;
/** @deprecated Use validateEconomyBehaviorContract. */
export const validateEconomyPolicy = validateEconomyBehaviorContract;
