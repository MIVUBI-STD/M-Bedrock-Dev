import { readFile } from "node:fs/promises";
import {
  validateEconomyBehaviorContract,
  type DeathRewardArbitration,
  type EconomyBehaviorContract,
  type InventoryFullRewardPolicy,
  type PickupCurrencyItemPolicy,
} from "../../../behavior-model/src/index.js";

const DEATH_ARBITRATION =
  new Set<DeathRewardArbitration>([
    "complementary",
    "mutually-exclusive",
    "unresolved",
  ]);

const PICKUP_ITEM_POLICY =
  new Set<PickupCurrencyItemPolicy>([
    "consume",
    "retain",
    "not-applicable",
  ]);

const INVENTORY_FULL_POLICY =
  new Set<InventoryFullRewardPolicy>([
    "leave-remainder",
    "defer",
    "convert",
    "reject",
    "compensate",
    "not-applicable",
  ]);

function nonEmptyString(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      "Economy Behavior Contract " +
        field +
        " must be a non-empty string.",
    );
  }
  return value;
}

function requiredBoolean(
  value: unknown,
  field: string,
): boolean {
  if (typeof value !== "boolean") {
    throw new Error(
      "Economy Behavior Contract " +
        field +
        " must be boolean.",
    );
  }
  return value;
}

function enumValue<T extends string>(
  value: unknown,
  values: ReadonlySet<T>,
  field: string,
): T {
  if (
    typeof value !== "string" ||
    !values.has(value as T)
  ) {
    throw new Error(
      "Economy Behavior Contract " +
        field +
        " has an invalid value.",
    );
  }
  return value as T;
}

export function parseEconomyBehaviorContract(
  value: unknown,
): EconomyBehaviorContract {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Economy Behavior Contract must be an object.",
    );
  }

  const item =
    value as Record<string, unknown>;
  if (item.schemaVersion !== 1) {
    throw new Error(
      "Economy Behavior Contract schemaVersion must be 1.",
    );
  }

  const contract: EconomyBehaviorContract = {
    schemaVersion: 1,
    id: nonEmptyString(item.id, "id"),
    deathRewardArbitration:
      enumValue(
        item.deathRewardArbitration,
        DEATH_ARBITRATION,
        "deathRewardArbitration",
      ),
    pickupCurrencyItemPolicy:
      enumValue(
        item.pickupCurrencyItemPolicy,
        PICKUP_ITEM_POLICY,
        "pickupCurrencyItemPolicy",
      ),
    inventoryFullPolicy:
      enumValue(
        item.inventoryFullPolicy,
        INVENTORY_FULL_POLICY,
        "inventoryFullPolicy",
      ),
    rewardIdempotencyRequired:
      requiredBoolean(
        item.rewardIdempotencyRequired,
        "rewardIdempotencyRequired",
      ),
    pickupScopeValidationRequired:
      requiredBoolean(
        item.pickupScopeValidationRequired,
        "pickupScopeValidationRequired",
      ),
    staleDropCleanupRequired:
      requiredBoolean(
        item.staleDropCleanupRequired,
        "staleDropCleanupRequired",
      ),
    terminalRewardRequiresResultCommit:
      requiredBoolean(
        item.terminalRewardRequiresResultCommit,
        "terminalRewardRequiresResultCommit",
      ),
  };

  const errors =
    validateEconomyBehaviorContract(contract);
  if (errors.length > 0) {
    throw new Error(
      "Invalid economy behavior contract: " +
        errors.join(" "),
    );
  }

  return contract;
}

export async function loadEconomyBehaviorContractFile(
  path: string,
): Promise<EconomyBehaviorContract> {
  const value = JSON.parse(
    await readFile(path, "utf8"),
  ) as unknown;
  return parseEconomyBehaviorContract(value);
}
