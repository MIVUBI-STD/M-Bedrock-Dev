import { readFile } from "node:fs/promises";
import {
  validateCombatPolicy,
  type CombatPolicy,
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
      "Combat policy " +
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
      "Combat policy " +
        field +
        " must be boolean.",
    );
  }
  return value;
}

export function parseCombatPolicy(
  value: unknown,
): CombatPolicy {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Combat policy must be an object.",
    );
  }

  const item =
    value as Record<string, unknown>;

  if (item.schemaVersion !== 1) {
    throw new Error(
      "Combat policy schemaVersion must be 1.",
    );
  }

  const policy: CombatPolicy = {
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
    validateCombatPolicy(policy);
  if (errors.length > 0) {
    throw new Error(
      "Invalid combat policy: " +
        errors.join(" "),
    );
  }

  return policy;
}

export async function loadCombatPolicyFile(
  path: string,
): Promise<CombatPolicy> {
  const value = JSON.parse(
    await readFile(path, "utf8"),
  ) as unknown;

  return parseCombatPolicy(value);
}
