import type {
  GameplayIntentModel,
  GameplayIntentNodeKind,
} from "../../gameplay-intent/src/index.js";
import type {
  ArenaCapacityExtractionResult,
} from "./arena-capacity-extraction.js";
import type {
  ArenaCleanupSurfaceAnalysis,
} from "./arena-cleanup-surface-analysis.js";
import type {
  ArenaLayoutReconciliation,
} from "./arena-layout-reconciliation.js";
import type {
  ArenaLifecycleAnalysis,
} from "./arena-lifecycle-analysis.js";
import type {
  ArenaProofConclusionReport,
} from "./arena-proof-conclusion.js";
import type {
  ArenaStateIsolationAnalysis,
} from "./arena-state-isolation-analysis.js";
import type {
  ArenaGlobalStateAnalysis,
} from "./arena-global-state-analysis.js";
import type {
  ArenaStressPlan,
} from "./arena-stress-plan.js";
import type {
  ArenaProofExecutionPlan,
} from "./arena-proof-execution-plan.js";
import type {
  ScriptSpatialAnalysis,
} from "./script-spatial-analysis.js";
import type {
  EntityAiStackAnalysis,
} from "./entity-ai-stack-analysis.js";
import type {
  RouteNavigationEnvironmentAnalysis,
} from "./route-navigation-environment-analysis.js";
import type {
  CombatLifecycleAnalysis,
} from "./combat-lifecycle-analysis.js";
import type {
  CombatRuntimeTelemetryAnalysis,
} from "./combat-runtime-telemetry-analysis.js";
import type {
  CombatPolicyAnalysis,
} from "./combat-policy-analysis.js";
import type {
  ChunkLifecycleAnalysis,
} from "./chunk-lifecycle-analysis.js";
import type {
  RewardSourceAnalysis,
  RewardSourceKind,
} from "./reward-source-analysis.js";
import type {
  EconomyPolicyAnalysis,
} from "./economy-policy-analysis.js";
import type {
  InventoryLifecycleAnalysis,
} from "./inventory-lifecycle-analysis.js";
import type {
  InventoryPolicyAnalysis,
} from "./inventory-policy-analysis.js";
import type {
  InventoryRestoreOwnershipAnalysis,
} from "./inventory-restore-ownership-analysis.js";
import type {
  SpatialAuthorityCoverageReport,
} from "./spatial-authority-analysis.js";

export interface GameplayWorldSubjectSummary {
  kind: GameplayIntentNodeKind;
  ids: readonly string[];
  authored: number;
  inferred: number;
  hypothesis: number;
}

export interface GameplayWorldModel {
  schemaVersion: 1;
  artifactId: string;
  subjects: readonly GameplayWorldSubjectSummary[];
  arenas: {
    detected: boolean;
    count?: number;
    basis?: "topology" | "script-config" | "reconciled";
    layoutStatus?: ArenaLayoutReconciliation["status"];
    requestedConcurrentArenas?: number;
    perArenaPlayerCapacity?: number;
    declaredMaxConcurrentPlayers?: number;
    capacityOk?: boolean;
    lifecycle: {
      terminalCandidates: number;
      proven: number;
      partial: number;
      unresolved: number;
    };
    cleanup: {
      acquiredSurfaces: number;
      exactProven: number;
      partial: number;
      unresolved: number;
      resourceLedger: {
        resources: number;
        complete: number;
        partial: number;
        missing: number;
        coverageRatio: number;
      };
    };
    isolation: {
      isolated: number;
      partitionProofRequired: number;
      sharedGlobal: number;
      unknown: number;
    };
    globalState: {
      arenaScopedMutations: number;
      pairedLeaseEvidence: number;
      unleasedArenaMutations: number;
      unauditedArenaMutations: number;
    };
    stress: {
      status: "planned" | "unavailable";
      totalNominalPlayers?: number;
      scenarios?: number;
    };
    proofExecution?: {
      mode: ArenaProofExecutionPlan["mode"];
      executedLayers: readonly string[];
      skippedLayers: readonly string[];
    };
    proof?: ArenaProofConclusionReport["conclusion"];
  };
  spatial: {
    resolvedScriptEffects: number;
    structurePlacements: number;
    unresolvedScriptMutations: number;
    rejectedScriptMutations: number;
    authority: {
      configured: boolean;
      policyValid: boolean;
      resolved: number;
      uncovered: number;
      conflicts: number;
      unknownRegions: number;
    };
  };
  chunks: {
    worldLoadObservers: number;
    entityLoadObservers: number;
    entityRemoveObservers: number;
    readinessProbes: number;
    tickingAreaReadinessStates: number;
    tickingAreaAcquires: number;
    tickingAreaReleases: number;
    pairedLeases: number;
    acquireWithoutRelease: number;
    releaseUnreachable: number;
    dynamicLeaseKeys: number;
    capacityUncheckedLeases: number;
    readinessUnverifiedLeases: number;
    shutdownOnlyCleanupRisk: number;
    worldLoadReconciliationPaths: number;
    unguardedDeferredChunkWork: number;
    entityResidencyObservability:
      "complete" | "partial" | "absent";
  };
  economy: {
    sourceKinds: readonly RewardSourceKind[];
    engineLootEntities: number;
    engineLootTables: number;
    unresolvedEngineLootTables: number;
    scriptInventoryGrants: number;
    worldDrops: number;
    pickupObservers: number;
    scriptLootCommands: number;
    functionLootCommands: number;
    scoreboardCredits: number;
    scoreboardDebits: number;
    scoreboardAdjustments: number;
    scoreboardWrites: number;
    deathRewardPaths: number;
    pickupCurrencyPaths: number;
    deathRewardSourceOverlapCandidates: number;
    pickupCurrencyWithoutConsumeCandidates: number;
    rewardPathsWithoutIdempotency: number;
    dropCleanupSurfaces: number;
    policy: {
      configured: boolean;
      deathRewardOverlapPolicyConflicts: number;
      deathRewardOverlapUnresolved: number;
      pickupCurrencyConsumeCoverageGaps: number;
      pickupCurrencyPolicyMismatch: number;
      idempotencyCoverageGaps: number;
      staleDropCleanupCoverageGaps: number;
      inventoryFullPolicyGaps: number;
      pickupScopeValidationUnproven: number;
      terminalRewardResultCommitUnproven: number;
    };
  };
  combat: {
    hurtHandlers: number;
    deathHandlers: number;
    damageApplications: number;
    secondaryEffects: number;
    projectileSpawns: number;
    projectileRemovals: number;
    projectileCleanupGap: number;
    hurtOnlyTerminalRisk: number;
    policy: {
      configured: boolean;
      revivePolicyContradictions: number;
      projectileCleanupPolicyGap: number;
      secondaryEffectEligibilitySurfaces: number;
    };
    runtime: {
      reviveAnomalies: number;
      selfRevive: number;
      multipleRevivers: number;
      staleRevive: number;
      reviveAfterDeath: number;
      invalidReviver: number;
      scopedLifeGenerationMissing: number;
      scopedArenaGenerationMissing: number;
    };
  };
  inventory: {
    regions: number;
    resetCandidates: number;
    completeResets: number;
    partialResets: number;
    copyMutationRisks: number;
    grantRegions: number;
    dropRegions: number;
    knownEquipmentSlots: number;
    unresolvedEquipmentSlotEvidence: number;
    restoreOwnership: {
      pathways: number;
      deterministicItemRestores: number;
      unknownIdentityGrants: number;
      multipleRestoreOwners: number;
    };
    policy: {
      configured: boolean;
      resolvedItemClasses: number;
      uncoveredItemClasses: number;
      unknownIdentityEvidence: number;
      deniedDrops: number;
      uncoveredDrops: number;
      unknownDrops: number;
    };
  };
  state: {
    semanticSurfaces: number;
    semanticOperations: number;
    broadWrites: number;
  };
  structures: {
    definitions: number;
    loads: number;
    unresolvedLoads: number;
    placements: number;
    runtimeLogicLoads: number;
  };
  entities: {
    definitions: number;
    knowledgePrerequisiteGaps: number;
    staticAnalysisLimits: number;
    resolvedSpawnEvidence: number;
    aiStack: {
      states: number;
      targetedStates: number;
      targetedStackComplete: number;
      targetedStackIncomplete: number;
      navigationWithoutMovement: number;
      targetedWithoutNavigation: number;
      movementGoalWithoutNavigation: number;
    };
    navigationEnvironment: {
      contracts: number;
      compatible: number;
      incompatible: number;
      stateDependent: number;
      unresolved: number;
    };
  };
  intent: {
    invariants: number;
    unknowns: readonly {
      id: string;
      question: string;
      blockedSubjectIds: readonly string[];
    }[];
  };
}

export interface GameplayWorldModelSource {
  artifactId: string;
  intent: GameplayIntentModel;
  arena: {
    autoDetected: boolean;
    spatialLayout?: {
      basis: "topology" | "script-config" | "reconciled";
      replicas: readonly unknown[];
    };
    discovery?: {
      replicas: readonly unknown[];
    };
    layoutReconciliation?: ArenaLayoutReconciliation;
    capacity?: ArenaCapacityExtractionResult;
    lifecycle?: ArenaLifecycleAnalysis;
    cleanupSurfaces?: ArenaCleanupSurfaceAnalysis;
    stateIsolation?: ArenaStateIsolationAnalysis;
    globalState?: ArenaGlobalStateAnalysis;
    stressPlan?: ArenaStressPlan;
    proofExecution?: ArenaProofExecutionPlan;
    proofConclusion?: ArenaProofConclusionReport;
    entitySpawnEvidence?: readonly unknown[];
  };
  scriptSpatial: ScriptSpatialAnalysis;
  spatialAuthority?: SpatialAuthorityCoverageReport;
  combatLifecycle?: CombatLifecycleAnalysis;
  combatRuntime?: CombatRuntimeTelemetryAnalysis;
  combatPolicy?: CombatPolicyAnalysis;
  chunkLifecycle?: ChunkLifecycleAnalysis;
  rewardSources?: RewardSourceAnalysis;
  economyPolicy?: EconomyPolicyAnalysis;
  inventoryLifecycle?: InventoryLifecycleAnalysis;
  inventoryPolicy?: InventoryPolicyAnalysis;
  inventoryRestoreOwnership?: InventoryRestoreOwnershipAnalysis;
  semanticIr: {
    stateSurfaces: number;
    stateOperations: number;
  };
  broadWrites: number;
  structures: {
    definitions: number;
    loads: number;
    unresolvedLoads: number;
    placements: number;
    runtimeLogicLoads: number;
  };
  entityAiStack?: EntityAiStackAnalysis;
  routeNavigationEnvironment?: RouteNavigationEnvironmentAnalysis;
  entities: {
    definitions: number;
    knowledgePrerequisiteGaps: number;
    staticAnalysisLimits: number;
  };
}

const SUBJECT_KINDS: readonly GameplayIntentNodeKind[] = [
  "game",
  "mechanic",
  "actor",
  "role",
  "objective",
  "phase",
  "state",
  "resource",
  "lifecycle",
  "spatial-region",
  "policy",
  "outcome",
];

function summarizeSubjects(
  intent: GameplayIntentModel,
): GameplayWorldSubjectSummary[] {
  return SUBJECT_KINDS.map((kind) => {
    const nodes = intent.nodes
      .filter((node) => node.kind === kind)
      .sort((a, b) => a.id.localeCompare(b.id));
    return {
      kind,
      ids: nodes.map((node) => node.id),
      authored: nodes.filter(
        (node) => node.status === "authored",
      ).length,
      inferred: nodes.filter(
        (node) => node.status === "inferred",
      ).length,
      hypothesis: nodes.filter(
        (node) => node.status === "hypothesis",
      ).length,
    };
  }).filter((item) => item.ids.length > 0);
}

export function deriveGameplayWorldModel(
  source: GameplayWorldModelSource,
): GameplayWorldModel {
  const arenaCount =
    source.arena.spatialLayout !== undefined
      ? 1 + source.arena.spatialLayout.replicas.length
      : source.arena.discovery !== undefined
        ? 1 + source.arena.discovery.replicas.length
        : source.arena.capacity?.evidence
            .requestedConcurrentArenas;

  return {
    schemaVersion: 1,
    artifactId: source.artifactId,
    subjects: summarizeSubjects(source.intent),
    arenas: {
      detected:
        source.arena.autoDetected ||
        arenaCount !== undefined,
      ...(arenaCount === undefined
        ? {}
        : { count: arenaCount }),
      ...(source.arena.spatialLayout === undefined
        ? {}
        : {
            basis:
              source.arena.spatialLayout.basis,
          }),
      ...(source.arena.layoutReconciliation === undefined
        ? {}
        : {
            layoutStatus:
              source.arena.layoutReconciliation.status,
          }),
      ...(source.arena.capacity?.evidence
          .requestedConcurrentArenas === undefined
        ? {}
        : {
            requestedConcurrentArenas:
              source.arena.capacity.evidence
                .requestedConcurrentArenas,
          }),
      ...(source.arena.capacity?.evidence
          .perArenaPlayerCapacity === undefined
        ? {}
        : {
            perArenaPlayerCapacity:
              source.arena.capacity.evidence
                .perArenaPlayerCapacity,
          }),
      ...(source.arena.capacity?.evidence
          .declaredMaxConcurrentPlayers === undefined
        ? {}
        : {
            declaredMaxConcurrentPlayers:
              source.arena.capacity.evidence
                .declaredMaxConcurrentPlayers,
          }),
      ...(source.arena.capacity?.report === undefined
        ? {}
        : {
            capacityOk:
              source.arena.capacity.report.ok,
          }),
      lifecycle: {
        terminalCandidates:
          source.arena.lifecycle?.terminalCandidates ?? 0,
        proven:
          source.arena.lifecycle?.proven ?? 0,
        partial:
          source.arena.lifecycle?.partial ?? 0,
        unresolved:
          source.arena.lifecycle?.unresolved ?? 0,
      },
      cleanup: {
        acquiredSurfaces:
          source.arena.cleanupSurfaces
            ?.acquiredSurfaces ?? 0,
        exactProven:
          source.arena.cleanupSurfaces
            ?.exactProven ?? 0,
        partial:
          source.arena.cleanupSurfaces
            ?.partial ?? 0,
        unresolved:
          source.arena.cleanupSurfaces
            ?.unresolved ?? 0,
        resourceLedger: {
          resources:
            source.arena.cleanupSurfaces
              ?.ledger?.resources ?? 0,
          complete:
            source.arena.cleanupSurfaces
              ?.ledger?.complete ?? 0,
          partial:
            source.arena.cleanupSurfaces
              ?.ledger?.partial ?? 0,
          missing:
            source.arena.cleanupSurfaces
              ?.ledger?.missing ?? 0,
          coverageRatio:
            source.arena.cleanupSurfaces
              ?.ledger?.coverageRatio ?? 1,
        },
      },
      isolation: {
        isolated:
          source.arena.stateIsolation?.isolated ?? 0,
        partitionProofRequired:
          source.arena.stateIsolation
            ?.partitionProofRequired ?? 0,
        sharedGlobal:
          source.arena.stateIsolation
            ?.sharedGlobal ?? 0,
        unknown:
          source.arena.stateIsolation?.unknown ?? 0,
      },
      globalState: {
        arenaScopedMutations:
          source.arena.globalState
            ?.arenaScopedMutations ?? 0,
        pairedLeaseEvidence:
          source.arena.globalState
            ?.pairedLeaseEvidence ?? 0,
        unleasedArenaMutations:
          source.arena.globalState
            ?.unleasedArenaMutations ?? 0,
        unauditedArenaMutations:
          source.arena.globalState
            ?.unauditedArenaMutations ?? 0,
      },
      stress:
        source.arena.stressPlan?.status === "planned" &&
        source.arena.stressPlan.matrix !== undefined
          ? {
              status: "planned",
              totalNominalPlayers:
                source.arena.stressPlan.matrix
                  .totalNominalPlayers,
              scenarios:
                source.arena.stressPlan.matrix
                  .scenarios.length,
            }
          : {
              status: "unavailable",
            },
      ...(source.arena.proofExecution === undefined
        ? {}
        : {
            proofExecution: {
              mode:
                source.arena.proofExecution.mode,
              executedLayers: [
                ...source.arena.proofExecution
                  .executedLayers,
              ],
              skippedLayers: [
                ...source.arena.proofExecution
                  .skippedLayers,
              ],
            },
          }),
      ...(source.arena.proofConclusion === undefined
        ? {}
        : {
            proof:
              source.arena.proofConclusion.conclusion,
          }),
    },
    spatial: {
      resolvedScriptEffects:
        source.scriptSpatial.resolvedEffects.length,
      structurePlacements:
        source.scriptSpatial.structurePlacements.length,
      unresolvedScriptMutations:
        source.scriptSpatial.failures.length,
      rejectedScriptMutations:
        source.scriptSpatial.rejectedMutations,
      authority: {
        configured:
          source.spatialAuthority !== undefined,
        policyValid:
          source.spatialAuthority?.policyValid ?? true,
        resolved:
          source.spatialAuthority?.resolved ?? 0,
        uncovered:
          source.spatialAuthority?.uncovered ?? 0,
        conflicts:
          source.spatialAuthority?.conflicts ?? 0,
        unknownRegions:
          source.spatialAuthority?.unknownRegions ?? 0,
      },
    },
    chunks: {
      worldLoadObservers:
        source.chunkLifecycle?.worldLoadObservers ?? 0,
      entityLoadObservers:
        source.chunkLifecycle?.entityLoadObservers ?? 0,
      entityRemoveObservers:
        source.chunkLifecycle?.entityRemoveObservers ?? 0,
      readinessProbes:
        source.chunkLifecycle?.readinessProbes ?? 0,
      tickingAreaReadinessStates:
        source.chunkLifecycle?.tickingAreaReadinessStates ?? 0,
      tickingAreaAcquires:
        source.chunkLifecycle?.tickingAreaAcquires ?? 0,
      tickingAreaReleases:
        source.chunkLifecycle?.tickingAreaReleases ?? 0,
      pairedLeases:
        source.chunkLifecycle?.pairedLeases ?? 0,
      acquireWithoutRelease:
        source.chunkLifecycle?.acquireWithoutRelease ?? 0,
      releaseUnreachable:
        source.chunkLifecycle?.releaseUnreachable ?? 0,
      dynamicLeaseKeys:
        source.chunkLifecycle?.dynamicLeaseKeys ?? 0,
      capacityUncheckedLeases:
        source.chunkLifecycle?.capacityUncheckedLeases ?? 0,
      readinessUnverifiedLeases:
        source.chunkLifecycle?.readinessUnverifiedLeases ?? 0,
      shutdownOnlyCleanupRisk:
        source.chunkLifecycle?.shutdownOnlyCleanupRisk ?? 0,
      worldLoadReconciliationPaths:
        source.chunkLifecycle?.worldLoadReconciliationPaths ?? 0,
      unguardedDeferredChunkWork:
        source.chunkLifecycle?.unguardedDeferredChunkWork ?? 0,
      entityResidencyObservability:
        source.chunkLifecycle?.entityResidencyObservability ?? "absent",
    },
    economy: {
      sourceKinds:
        source.rewardSources?.sourceKinds ?? [],
      engineLootEntities:
        source.rewardSources?.engineLootEntities ?? 0,
      engineLootTables:
        source.rewardSources?.engineLootTables ?? 0,
      unresolvedEngineLootTables:
        source.rewardSources?.unresolvedEngineLootTables ?? 0,
      scriptInventoryGrants:
        source.rewardSources?.scriptInventoryGrants ?? 0,
      worldDrops:
        source.rewardSources?.worldDrops ?? 0,
      pickupObservers:
        source.rewardSources?.pickupObservers ?? 0,
      scriptLootCommands:
        source.rewardSources?.scriptLootCommands ?? 0,
      functionLootCommands:
        source.rewardSources?.functionLootCommands ?? 0,
      scoreboardCredits:
        source.rewardSources?.scoreboardCredits ?? 0,
      scoreboardDebits:
        source.rewardSources?.scoreboardDebits ?? 0,
      scoreboardAdjustments:
        source.rewardSources?.scoreboardAdjustments ?? 0,
      scoreboardWrites:
        source.rewardSources?.scoreboardWrites ?? 0,
      deathRewardPaths:
        source.rewardSources?.deathRewardPaths ?? 0,
      pickupCurrencyPaths:
        source.rewardSources?.pickupCurrencyPaths ?? 0,
      deathRewardSourceOverlapCandidates:
        source.rewardSources
          ?.deathRewardSourceOverlapCandidates ?? 0,
      pickupCurrencyWithoutConsumeCandidates:
        source.rewardSources
          ?.pickupCurrencyWithoutConsumeCandidates ?? 0,
      rewardPathsWithoutIdempotency:
        source.rewardSources
          ?.rewardPathsWithoutIdempotency ?? 0,
      dropCleanupSurfaces:
        source.rewardSources?.dropCleanupSurfaces ?? 0,
      policy: {
        configured:
          source.economyPolicy?.configured ?? false,
        deathRewardOverlapPolicyConflicts:
          source.economyPolicy
            ?.deathRewardOverlapPolicyConflicts ?? 0,
        deathRewardOverlapUnresolved:
          source.economyPolicy
            ?.deathRewardOverlapUnresolved ?? 0,
        pickupCurrencyConsumeCoverageGaps:
          source.economyPolicy
            ?.pickupCurrencyConsumeCoverageGaps ?? 0,
        pickupCurrencyPolicyMismatch:
          source.economyPolicy
            ?.pickupCurrencyPolicyMismatch ?? 0,
        idempotencyCoverageGaps:
          source.economyPolicy
            ?.idempotencyCoverageGaps ?? 0,
        staleDropCleanupCoverageGaps:
          source.economyPolicy
            ?.staleDropCleanupCoverageGaps ?? 0,
        inventoryFullPolicyGaps:
          source.economyPolicy
            ?.inventoryFullPolicyGaps ?? 0,
        pickupScopeValidationUnproven:
          source.economyPolicy
            ?.pickupScopeValidationUnproven ?? 0,
        terminalRewardResultCommitUnproven:
          source.economyPolicy
            ?.terminalRewardResultCommitUnproven ?? 0,
      },
    },
    combat: {
      hurtHandlers:
        source.combatLifecycle?.hurtHandlers ?? 0,
      deathHandlers:
        source.combatLifecycle?.deathHandlers ?? 0,
      damageApplications:
        source.combatLifecycle?.damageApplications ?? 0,
      secondaryEffects:
        source.combatLifecycle?.secondaryEffects ?? 0,
      projectileSpawns:
        source.combatLifecycle?.projectileSpawns ?? 0,
      projectileRemovals:
        source.combatLifecycle?.projectileRemovals ?? 0,
      projectileCleanupGap:
        source.combatLifecycle?.projectileCleanupGap ?? 0,
      hurtOnlyTerminalRisk:
        source.combatLifecycle?.hurtOnlyTerminalRisk ?? 0,
      policy: {
        configured:
          source.combatPolicy?.configured ?? false,
        revivePolicyContradictions:
          source.combatPolicy?.revivePolicyContradictions ?? 0,
        projectileCleanupPolicyGap:
          source.combatPolicy?.projectileCleanupPolicyGap ?? 0,
        secondaryEffectEligibilitySurfaces:
          source.combatPolicy?.secondaryEffectEligibilitySurfaces ?? 0,
      },
      runtime: {
        reviveAnomalies:
          source.combatRuntime?.reviveAnomalies ?? 0,
        selfRevive:
          source.combatRuntime?.byKind["self-revive"] ?? 0,
        multipleRevivers:
          source.combatRuntime?.byKind["multiple-revivers"] ?? 0,
        staleRevive:
          source.combatRuntime?.byKind["stale-revive"] ?? 0,
        reviveAfterDeath:
          source.combatRuntime?.byKind["revive-after-death"] ?? 0,
        invalidReviver:
          source.combatRuntime?.byKind["invalid-reviver"] ?? 0,
        scopedLifeGenerationMissing:
          source.combatRuntime?.scopedLifeGenerationMissing ?? 0,
        scopedArenaGenerationMissing:
          source.combatRuntime?.scopedArenaGenerationMissing ?? 0,
      },
    },
    inventory: {
      regions:
        source.inventoryLifecycle?.regions ?? 0,
      resetCandidates:
        source.inventoryLifecycle?.resetCandidates ?? 0,
      completeResets:
        source.inventoryLifecycle?.completeResets ?? 0,
      partialResets:
        source.inventoryLifecycle?.partialResets ?? 0,
      copyMutationRisks:
        source.inventoryLifecycle?.copyMutationRisks ?? 0,
      grantRegions:
        source.inventoryLifecycle?.grantRegions ?? 0,
      dropRegions:
        source.inventoryLifecycle?.dropRegions ?? 0,
      knownEquipmentSlots:
        source.inventoryLifecycle
          ?.knownEquipmentSlots.length ?? 0,
      unresolvedEquipmentSlotEvidence:
        source.inventoryLifecycle
          ?.unresolvedEquipmentSlotEvidence ?? 0,
      restoreOwnership: {
        pathways:
          source.inventoryRestoreOwnership
            ?.restorePathways ?? 0,
        deterministicItemRestores:
          source.inventoryRestoreOwnership
            ?.deterministicItemRestores ?? 0,
        unknownIdentityGrants:
          source.inventoryRestoreOwnership
            ?.unknownIdentityGrants ?? 0,
        multipleRestoreOwners:
          source.inventoryRestoreOwnership
            ?.multipleRestoreOwners ?? 0,
      },
      policy: {
        configured:
          source.inventoryPolicy?.configured ?? false,
        resolvedItemClasses:
          source.inventoryPolicy
            ?.resolvedItemClasses ?? 0,
        uncoveredItemClasses:
          source.inventoryPolicy
            ?.uncoveredItemClasses ?? 0,
        unknownIdentityEvidence:
          source.inventoryPolicy
            ?.unknownIdentityEvidence ?? 0,
        deniedDrops:
          source.inventoryPolicy
            ?.deniedDrops ?? 0,
        uncoveredDrops:
          source.inventoryPolicy
            ?.uncoveredDrops ?? 0,
        unknownDrops:
          source.inventoryPolicy
            ?.unknownDrops ?? 0,
      },
    },
    state: {
      semanticSurfaces:
        source.semanticIr.stateSurfaces,
      semanticOperations:
        source.semanticIr.stateOperations,
      broadWrites: source.broadWrites,
    },
    structures: {
      ...source.structures,
    },
    entities: {
      ...source.entities,
      resolvedSpawnEvidence:
        source.arena.entitySpawnEvidence?.length ?? 0,
      aiStack: {
        states:
          source.entityAiStack?.states ?? 0,
        targetedStates:
          source.entityAiStack?.targetedStates ?? 0,
        targetedStackComplete:
          source.entityAiStack
            ?.targetedStackComplete ?? 0,
        targetedStackIncomplete:
          source.entityAiStack
            ?.targetedStackIncomplete ?? 0,
        navigationWithoutMovement:
          source.entityAiStack
            ?.navigationWithoutMovement ?? 0,
        targetedWithoutNavigation:
          source.entityAiStack
            ?.targetedWithoutNavigation ?? 0,
        movementGoalWithoutNavigation:
          source.entityAiStack
            ?.movementGoalWithoutNavigation ?? 0,
      },
      navigationEnvironment: {
        contracts:
          source.routeNavigationEnvironment
            ?.contracts ?? 0,
        compatible:
          source.routeNavigationEnvironment
            ?.compatible ?? 0,
        incompatible:
          source.routeNavigationEnvironment
            ?.incompatible ?? 0,
        stateDependent:
          source.routeNavigationEnvironment
            ?.stateDependent ?? 0,
        unresolved:
          source.routeNavigationEnvironment
            ?.unresolved ?? 0,
      },
    },
    intent: {
      invariants: source.intent.invariants.length,
      unknowns: source.intent.unknowns
        .map((item) => ({
          id: item.id,
          question: item.question,
          blockedSubjectIds: [
            ...item.blockedSubjectIds,
          ],
        }))
        .sort((a, b) =>
          a.id.localeCompare(b.id)
        ),
    },
  };
}
