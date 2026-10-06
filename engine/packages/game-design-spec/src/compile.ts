import type {
  InventoryItemBehaviorContract,
  SpatialAuthorityPolicy,
} from "../../behavior-model/src/index.js";
import type {
  GameDesignBehaviorConstraints,
  GameDesignSpec,
} from "./types.js";

export interface GameDesignBehaviorCompilation {
  designId: string;
  approved: boolean;
  classification?: GameDesignSpec["classification"];
  constraints: GameDesignBehaviorConstraints;
  completeContracts: {
    inventory?: InventoryItemBehaviorContract;
    spatial?: SpatialAuthorityPolicy;
  };
  unresolved: readonly string[];
}

export function compileGameDesignBehaviorContracts(
  design: GameDesignSpec,
): GameDesignBehaviorCompilation {
  const constraints = design.behaviorConstraints ?? {};
  const completeContracts: GameDesignBehaviorCompilation["completeContracts"] = {};
  const unresolved: string[] = [];

  if (design.status !== "approved") {
    return {
      designId: design.id,
      approved: false,
      ...(design.classification === undefined
        ? {}
        : {
            classification:
              design.classification,
          }),
      constraints,
      completeContracts,
      unresolved: [
        "Game Design is not approved; authoritative Behavior Contracts are not emitted.",
      ],
    };
  }

  if (constraints.combat) {
    for (const field of [
      "friendlyFireAllowed",
      "crossArenaDamageAllowed",
      "environmentalDamageAllowed",
      "selfReviveAllowed",
      "multipleReviversAllowed",
      "reviveAfterDeathAllowed",
    ] as const) {
      if (constraints.combat[field] === undefined) {
        unresolved.push("combat." + field + " is unspecified by Game Design.");
      }
    }
    unresolved.push(
      "Combat generation binding, projectile cleanup, and secondary-effect safety remain Engineering Contract concerns; Game Design never defaults them.",
    );
  }

  if (constraints.economy) {
    for (const field of [
      "deathRewardArbitration",
      "pickupCurrencyItemPolicy",
      "inventoryFullPolicy",
    ] as const) {
      if (constraints.economy[field] === undefined) {
        unresolved.push("economy." + field + " is unspecified by Game Design.");
      }
    }
    unresolved.push(
      "Economy idempotency, stale-drop cleanup, scope validation, and result-commit ordering remain Engineering Contract concerns.",
    );
  }

  if (constraints.inventory) {
    completeContracts.inventory = {
      schemaVersion: 1,
      id: design.id + ":inventory",
      rules: constraints.inventory.rules,
    };
  }

  if (constraints.spatial) {
    completeContracts.spatial = {
      schemaVersion: 1,
      id: design.id + ":spatial",
      rules: constraints.spatial.rules,
    };
  }

  return {
    designId: design.id,
    approved: true,
    ...(design.classification === undefined
      ? {}
      : {
          classification:
            design.classification,
        }),
    constraints,
    completeContracts,
    unresolved,
  };
}
