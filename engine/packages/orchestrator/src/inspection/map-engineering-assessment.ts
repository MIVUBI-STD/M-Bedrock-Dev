import type {
  GameplayWorldModel,
} from "./gameplay-world-model.js";

export interface MapEngineeringAssessment {
  schemaVersion: 1;
  artifactId: string;
  gameplayClosure:
    GameplayWorldModel["gameplayClosure"];
  stateClosure:
    GameplayWorldModel["stateClosure"];
  arena: {
    requestedConcurrentArenas?: number;
    safeConcurrentArenas?: number | null;
    declaredConcurrentArenaLimit?: number;
    perArenaPlayerCapacity?: number;
    declaredMaxConcurrentPlayers?: number;
    capacityOk?: boolean;
    lifecycle: GameplayWorldModel["arenas"]["lifecycle"];
    cleanup: GameplayWorldModel["arenas"]["cleanup"];
    isolation: GameplayWorldModel["arenas"]["isolation"];
    globalState: GameplayWorldModel["arenas"]["globalState"];
    stress: GameplayWorldModel["arenas"]["stress"];
    repeatedRun?:
      GameplayWorldModel["arenas"]["repeatedRun"];
    proofExecution?: GameplayWorldModel["arenas"]["proofExecution"];
    proof?: GameplayWorldModel["arenas"]["proof"];
    replicaIntegrity:
      GameplayWorldModel["arenas"]["replicaIntegrity"];
    replicaProof:
      GameplayWorldModel["arenas"]["replicaProof"];
  };
  spatial: {
    unresolvedScriptMutations: number;
    rejectedScriptMutations: number;
    authority: GameplayWorldModel["spatial"]["authority"];
  };
  persistence?: GameplayWorldModel["persistence"];
  chunks: GameplayWorldModel["chunks"];
  economy: {
    unresolvedEngineLootTables: number;
    deathRewardSourceOverlapCandidates: number;
    deathRewardSourceOverlapUnresolved: number;
    pickupCurrencyWithoutConsumeCandidates: number;
    rewardPathsWithoutIdempotency: number;
    dropCleanupSurfaces: number;
    worldDropRewardPathsWithoutCleanup: number;
    contract: GameplayWorldModel["economy"]["policy"];
  };
  combat: {
    projectileCleanupGap: number;
    hurtOnlyTerminalRisk: number;
    contract: GameplayWorldModel["combat"]["policy"];
    runtime: GameplayWorldModel["combat"]["runtime"];
  };
  inventory: {
    completeResets: number;
    partialResets: number;
    copyMutationRisks: number;
    unresolvedEquipmentSlotEvidence: number;
    restoreOwnership: GameplayWorldModel["inventory"]["restoreOwnership"];
    contract: GameplayWorldModel["inventory"]["policy"];
  };
  entities: {
    knowledgePrerequisiteGaps: number;
    staticAnalysisLimits: number;
    targetedStackIncomplete: number;
    navigationWithoutMovement: number;
    targetedWithoutNavigation: number;
    movementGoalWithoutNavigation: number;
    navigationEnvironment: GameplayWorldModel["entities"]["navigationEnvironment"];
  };
  state: {
    broadWrites: number;
  };
}

export function projectMapEngineeringAssessment(
  source: GameplayWorldModel,
): MapEngineeringAssessment {
  return {
    schemaVersion: 1,
    artifactId: source.artifactId,
    gameplayClosure:
      source.gameplayClosure,
    stateClosure:
      source.stateClosure,
    arena: {
      ...(source.arenas.requestedConcurrentArenas === undefined
        ? {}
        : { requestedConcurrentArenas: source.arenas.requestedConcurrentArenas }),
      ...(source.arenas.safeConcurrentArenas === undefined
        ? {}
        : { safeConcurrentArenas: source.arenas.safeConcurrentArenas }),
      ...(source.arenas.declaredConcurrentArenaLimit === undefined
        ? {}
        : { declaredConcurrentArenaLimit: source.arenas.declaredConcurrentArenaLimit }),
      ...(source.arenas.perArenaPlayerCapacity === undefined
        ? {}
        : { perArenaPlayerCapacity: source.arenas.perArenaPlayerCapacity }),
      ...(source.arenas.declaredMaxConcurrentPlayers === undefined
        ? {}
        : { declaredMaxConcurrentPlayers: source.arenas.declaredMaxConcurrentPlayers }),
      ...(source.arenas.capacityOk === undefined ? {} : { capacityOk: source.arenas.capacityOk }),
      lifecycle: source.arenas.lifecycle,
      cleanup: source.arenas.cleanup,
      isolation: source.arenas.isolation,
      globalState: source.arenas.globalState,
      stress: source.arenas.stress,
      ...(source.arenas.repeatedRun === undefined
        ? {}
        : {
            repeatedRun:
              source.arenas.repeatedRun,
          }),
      ...(source.arenas.proofExecution === undefined ? {} : { proofExecution: source.arenas.proofExecution }),
      ...(source.arenas.proof === undefined ? {} : { proof: source.arenas.proof }),
      replicaIntegrity:
        source.arenas.replicaIntegrity,
      replicaProof:
        source.arenas.replicaProof,
    },
    spatial: {
      unresolvedScriptMutations: source.spatial.unresolvedScriptMutations,
      rejectedScriptMutations: source.spatial.rejectedScriptMutations,
      authority: source.spatial.authority,
    },
    ...(source.persistence === undefined ? {} : { persistence: source.persistence }),
    chunks: source.chunks,
    economy: {
      unresolvedEngineLootTables: source.economy.unresolvedEngineLootTables,
      deathRewardSourceOverlapCandidates: source.economy.deathRewardSourceOverlapCandidates,
      deathRewardSourceOverlapUnresolved: source.economy.deathRewardSourceOverlapUnresolved,
      pickupCurrencyWithoutConsumeCandidates: source.economy.pickupCurrencyWithoutConsumeCandidates,
      rewardPathsWithoutIdempotency: source.economy.rewardPathsWithoutIdempotency,
      dropCleanupSurfaces: source.economy.dropCleanupSurfaces,
      worldDropRewardPathsWithoutCleanup: source.economy.worldDropRewardPathsWithoutCleanup,
      contract: source.economy.policy,
    },
    combat: {
      projectileCleanupGap: source.combat.projectileCleanupGap,
      hurtOnlyTerminalRisk: source.combat.hurtOnlyTerminalRisk,
      contract: source.combat.policy,
      runtime: source.combat.runtime,
    },
    inventory: {
      completeResets: source.inventory.completeResets,
      partialResets: source.inventory.partialResets,
      copyMutationRisks: source.inventory.copyMutationRisks,
      unresolvedEquipmentSlotEvidence: source.inventory.unresolvedEquipmentSlotEvidence,
      restoreOwnership: source.inventory.restoreOwnership,
      contract: source.inventory.policy,
    },
    entities: {
      knowledgePrerequisiteGaps: source.entities.knowledgePrerequisiteGaps,
      staticAnalysisLimits: source.entities.staticAnalysisLimits,
      targetedStackIncomplete: source.entities.aiStack.targetedStackIncomplete,
      navigationWithoutMovement: source.entities.aiStack.navigationWithoutMovement,
      targetedWithoutNavigation: source.entities.aiStack.targetedWithoutNavigation,
      movementGoalWithoutNavigation: source.entities.aiStack.movementGoalWithoutNavigation,
      navigationEnvironment: source.entities.navigationEnvironment,
    },
    state: {
      broadWrites: source.state.broadWrites,
    },
  };
}
