import { readFile } from "node:fs/promises";
import {
  validateCombatBehaviorContract,
  type CombatBehaviorContract,
} from "../../behavior-model/src/index.js";

function nonEmptyString(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      "Combat Behavior Contract " +
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
      "Combat Behavior Contract " +
        field +
        " must be boolean.",
    );
  }
  return value;
}

export function parseCombatBehaviorContract(
  value: unknown,
): CombatBehaviorContract {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Combat Behavior Contract must be an object.",
    );
  }

  const item =
    value as Record<string, unknown>;

  if (item.schemaVersion !== 1) {
    throw new Error(
      "Combat Behavior Contract schemaVersion must be 1.",
    );
  }

  const contract: CombatBehaviorContract = {
    schemaVersion: 1,
    id: nonEmptyString(
      item.id,
      "id",
    ),
    friendlyFireAllowed:
      requiredBoolean(
        item.friendlyFireAllowed,
        "friendlyFireAllowed",
      ),
    crossArenaDamageAllowed:
      requiredBoolean(
        item.crossArenaDamageAllowed,
        "crossArenaDamageAllowed",
      ),
    secondaryEffectsRequireDamageEligibility:
      requiredBoolean(
        item.secondaryEffectsRequireDamageEligibility,
        "secondaryEffectsRequireDamageEligibility",
      ),
    projectileGenerationBound:
      requiredBoolean(
        item.projectileGenerationBound,
        "projectileGenerationBound",
      ),
    projectileCleanupOnGenerationEnd:
      requiredBoolean(
        item.projectileCleanupOnGenerationEnd,
        "projectileCleanupOnGenerationEnd",
      ),
    environmentalDamageAllowed:
      requiredBoolean(
        item.environmentalDamageAllowed,
        "environmentalDamageAllowed",
      ),
    reviveGenerationBound:
      requiredBoolean(
        item.reviveGenerationBound,
        "reviveGenerationBound",
      ),
    selfReviveAllowed:
      requiredBoolean(
        item.selfReviveAllowed,
        "selfReviveAllowed",
      ),
    multipleReviversAllowed:
      requiredBoolean(
        item.multipleReviversAllowed,
        "multipleReviversAllowed",
      ),
    reviveAfterDeathAllowed:
      requiredBoolean(
        item.reviveAfterDeathAllowed,
        "reviveAfterDeathAllowed",
      ),
  };

  const errors =
    validateCombatBehaviorContract(contract);
  if (errors.length > 0) {
    throw new Error(
      "Invalid combat behavior contract: " +
        errors.join(" "),
    );
  }

  return contract;
}

export async function loadCombatBehaviorContractFile(
  path: string,
): Promise<CombatBehaviorContract> {
  const value = JSON.parse(
    await readFile(path, "utf8"),
  ) as unknown;

  return parseCombatBehaviorContract(value);
}
