import type {
  GameplayWorldModel,
  GameplayWorldSubjectSummary,
} from "./gameplay-world-model.js";

export interface GameplaySemanticModel {
  schemaVersion: 1;
  artifactId: string;
  subjects: readonly GameplayWorldSubjectSummary[];
  gameplayClosure: GameplayWorldModel["gameplayClosure"];
  arenas: {
    detected: boolean;
    count?: number;
    basis?: "topology" | "script-config" | "reconciled";
    layoutStatus?: GameplayWorldModel["arenas"]["layoutStatus"];
  };
  spatial: {
    resolvedScriptEffects: number;
    structurePlacements: number;
  };
  systems: {
    economy: {
      sourceKinds: GameplayWorldModel["economy"]["sourceKinds"];
      engineLootEntities: number;
      engineLootTables: number;
      scriptInventoryGrants: number;
      worldDrops: number;
      pickupObservers: number;
      deathRewardPaths: number;
      pickupCurrencyPaths: number;
    };
    combat: {
      hurtHandlers: number;
      deathHandlers: number;
      damageApplications: number;
      secondaryEffects: number;
      projectileSpawns: number;
      projectileRemovals: number;
    };
    inventory: {
      regions: number;
      resetCandidates: number;
      grantRegions: number;
      dropRegions: number;
      knownEquipmentSlots: number;
    };
    state: {
      semanticSurfaces: number;
      semanticOperations: number;
    };
    structures: GameplayWorldModel["structures"];
    entities: {
      definitions: number;
      resolvedSpawnEvidence: number;
      aiStates: number;
      targetedStates: number;
    };
  };
  intent: GameplayWorldModel["intent"];
}

export function projectGameplaySemanticModel(
  source: GameplayWorldModel,
): GameplaySemanticModel {
  return {
    schemaVersion: 1,
    artifactId: source.artifactId,
    subjects: source.subjects,
    gameplayClosure: source.gameplayClosure,
    arenas: {
      detected: source.arenas.detected,
      ...(source.arenas.count === undefined ? {} : { count: source.arenas.count }),
      ...(source.arenas.basis === undefined ? {} : { basis: source.arenas.basis }),
      ...(source.arenas.layoutStatus === undefined ? {} : { layoutStatus: source.arenas.layoutStatus }),
    },
    spatial: {
      resolvedScriptEffects: source.spatial.resolvedScriptEffects,
      structurePlacements: source.spatial.structurePlacements,
    },
    systems: {
      economy: {
        sourceKinds: source.economy.sourceKinds,
        engineLootEntities: source.economy.engineLootEntities,
        engineLootTables: source.economy.engineLootTables,
        scriptInventoryGrants: source.economy.scriptInventoryGrants,
        worldDrops: source.economy.worldDrops,
        pickupObservers: source.economy.pickupObservers,
        deathRewardPaths: source.economy.deathRewardPaths,
        pickupCurrencyPaths: source.economy.pickupCurrencyPaths,
      },
      combat: {
        hurtHandlers: source.combat.hurtHandlers,
        deathHandlers: source.combat.deathHandlers,
        damageApplications: source.combat.damageApplications,
        secondaryEffects: source.combat.secondaryEffects,
        projectileSpawns: source.combat.projectileSpawns,
        projectileRemovals: source.combat.projectileRemovals,
      },
      inventory: {
        regions: source.inventory.regions,
        resetCandidates: source.inventory.resetCandidates,
        grantRegions: source.inventory.grantRegions,
        dropRegions: source.inventory.dropRegions,
        knownEquipmentSlots: source.inventory.knownEquipmentSlots,
      },
      state: {
        semanticSurfaces: source.state.semanticSurfaces,
        semanticOperations: source.state.semanticOperations,
      },
      structures: source.structures,
      entities: {
        definitions: source.entities.definitions,
        resolvedSpawnEvidence: source.entities.resolvedSpawnEvidence,
        aiStates: source.entities.aiStack.states,
        targetedStates: source.entities.aiStack.targetedStates,
      },
    },
    intent: source.intent,
  };
}
