import {
  assessGameplayModelClosure,
  assessGameplayStateClosure,
  buildIntentClosureSurfaces,
  type GameplayClosureSurface,
  type GameplayIntentModel,
  type GameplayIntentNodeKind,
  type GameplayModelClosureResult,
} from "../../../gameplay-intent/src/index.js";
import type {
  ArenaCapacityExtractionResult,
} from "../arena-capacity-extraction.js";
import type {
  ArenaCleanupSurfaceAnalysis,
} from "../arena-cleanup-surface-analysis.js";
import type {
  ArenaLayoutReconciliation,
} from "../arena-layout-reconciliation.js";
import type {
  ArenaLifecycleAnalysis,
} from "../arena-lifecycle-analysis.js";
import type {
  ArenaProofConclusionReport,
} from "../arena-proof-conclusion.js";
import type {
  ArenaStateIsolationAnalysis,
} from "../arena-state-isolation-analysis.js";
import type {
  ArenaGlobalStateAnalysis,
} from "../arena-global-state-analysis.js";
import type {
  ArenaStressPlan,
} from "../arena-stress-plan.js";
import type {
  ArenaProofExecutionPlan,
} from "../arena-proof-execution-plan.js";
import type {
  ArenaRepeatedRunValidationPlan,
} from "../arena-repeated-run-validation.js";
import type {
  ArenaReplicaProofQuality,
} from "../arena-replica-proof-quality.js";
import type {
  ScriptSpatialAnalysis,
} from "../script-spatial-analysis.js";
import type {
  EntityAiStackAnalysis,
} from "../entity-ai-stack-analysis.js";
import type {
  RouteNavigationEnvironmentAnalysis,
} from "../route-navigation-environment-analysis.js";
import type {
  CombatLifecycleAnalysis,
} from "../combat-lifecycle-analysis.js";
import type {
  CombatRuntimeTelemetryAnalysis,
} from "../combat-runtime-telemetry-analysis.js";
import type {
  CombatContractAnalysis,
} from "../combat-contract-analysis.js";
import type {
  ChunkLifecycleAnalysis,
} from "../chunk-lifecycle-analysis.js";
import type {
  RewardSourceAnalysis,
  RewardSourceKind,
} from "../reward-source-analysis.js";
import type {
  EconomyContractAnalysis,
} from "../economy-contract-analysis.js";
import type {
  InventoryLifecycleAnalysis,
} from "../inventory-lifecycle-analysis.js";
import type {
  InventoryContractAnalysis,
} from "../inventory-contract-analysis.js";
import type {
  InventoryRestoreOwnershipAnalysis,
} from "../inventory-restore-ownership-analysis.js";
import type {
  SpatialAuthorityCoverageReport,
} from "../spatial-authority-analysis.js";
import type {
  PersistenceSourceAnalysis,
} from "../persistence-source-analysis.js";
import {
  discoverGameplaySurfaces,
} from "./gameplay-surface-discovery.js";

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
  gameplayClosure: GameplayModelClosureResult;
  stateClosure:
    ReturnType<typeof assessGameplayStateClosure>;
  arenas: {
    detected: boolean;
    count?: number;
    basis?: "topology" | "script-config" | "reconciled";
    layoutStatus?: ArenaLayoutReconciliation["status"];
    requestedConcurrentArenas?: number;
    safeConcurrentArenas?: number | null;
    declaredConcurrentArenaLimit?: number;
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
    repeatedRun?: {
      runCounts: readonly number[];
      stages: number;
      compareSurfaces: readonly string[];
    };
    proofExecution?: {
      mode: ArenaProofExecutionPlan["mode"];
      executedLayers: readonly string[];
      skippedLayers: readonly string[];
    };
    proof?: ArenaProofConclusionReport["conclusion"];
    replicaIntegrity: {
      complete: number;
      bounded: number;
      diverged: number;
      incomplete: number;
      noProof: number;
    };
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
  persistence?: {
    properties: number;
    appendWithoutClear: number;
    worldScopedAppendWithoutClear: number;
    unknownScope: number;
    unknownLifetime: number;
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
    cleanupOrderUnproven: number;
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
    deathRewardSourceOverlapUnresolved: number;
    pickupCurrencyWithoutConsumeCandidates: number;
    rewardPathsWithoutIdempotency: number;
    dropCleanupSurfaces: number;
    worldDropRewardPathsWithoutCleanup: number;
    policy: {
      configured: boolean;
      deathRewardOverlapContractConflicts: number;
      deathRewardOverlapUnresolved: number;
      pickupCurrencyConsumeCoverageGaps: number;
      pickupCurrencyContractMismatch: number;
      idempotencyCoverageGaps: number;
      staleDropCleanupCoverageGaps: number;
      inventoryFullContractGaps: number;
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
      reviveContractContradictions: number;
      projectileCleanupContractGap: number;
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
    transitionResidueRisks: number;
    transitionResidueUnresolved: number;
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
    repeatedRunPlan?:
      ArenaRepeatedRunValidationPlan;
    proofExecution?: ArenaProofExecutionPlan;
    proofConclusion?: ArenaProofConclusionReport;
    replicaProofQuality?:
      readonly ArenaReplicaProofQuality[];
    entitySpawnEvidence?: readonly unknown[];
  };
  scriptSpatial: ScriptSpatialAnalysis;
  spatialAuthority?: SpatialAuthorityCoverageReport;
  combatLifecycle?: CombatLifecycleAnalysis;
  combatRuntime?: CombatRuntimeTelemetryAnalysis;
  combatPolicy?: CombatContractAnalysis;
  chunkLifecycle?: ChunkLifecycleAnalysis;
  persistenceSource?: PersistenceSourceAnalysis;
  rewardSources?: RewardSourceAnalysis;
  economyPolicy?: EconomyContractAnalysis;
  inventoryLifecycle?: InventoryLifecycleAnalysis;
  inventoryPolicy?: InventoryContractAnalysis;
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
    transitionResidueRisks?: number;
    transitionResidueUnresolved?: number;
  };
  entityAiStack?: EntityAiStackAnalysis;
  routeNavigationEnvironment?: RouteNavigationEnvironmentAnalysis;
  entities: {
    definitions: number;
    knowledgePrerequisiteGaps: number;
    staticAnalysisLimits: number;
  };
  boundaries?: {
    records: number;
    unresolvedNames: readonly string[];
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

  const runtimeSurfaces: GameplayClosureSurface[] = [];

  const arenaDetected =
    source.arena.autoDetected ||
    arenaCount !== undefined;
  if (arenaDetected) {
    runtimeSurfaces.push({
      id: "runtime:arena",
      label: "Arena system",
      kind: "runtime-domain",
      status: "understood",
      material: true,
      boundaries:
        arenaCount === undefined
          ? []
          : ["visibleArenaCount=" + arenaCount],
    });

    const requested =
      source.arena.capacity?.evidence
        .requestedConcurrentArenas;
    const safe =
      source.arena.capacity?.report
        ?.safeConcurrentArenas;
    const unresolvedCapacity =
      source.arena.capacity === undefined ||
      source.arena.capacity.evidence.arenaCountConflict ||
      (
        arenaCount !== undefined &&
        arenaCount > 1 &&
        (
          source.arena.capacity.report === undefined ||
          source.arena.capacity.report.safeConcurrentArenas === null
        )
      ) ||
      (
        source.arena.capacity.evidence
          .scriptTickingAreaManagerReferenced &&
        !source.arena.capacity.evidence
          .scriptTickingAreaCapacityResolved
      );

    runtimeSurfaces.push({
      id: "runtime:arena-capacity",
      label: "Arena capacity and concurrency",
      kind: "runtime-domain",
      status: unresolvedCapacity
        ? "unknown"
        : "understood",
      material: true,
      ...(unresolvedCapacity
        ? {
            reason:
              "Arena capacity/concurrency has unresolved selected-artifact evidence.",
          }
        : {}),
      boundaries: [
        ...(arenaCount === undefined
          ? []
          : ["visibleArenaCount=" + arenaCount]),
        ...(requested === undefined
          ? []
          : ["requestedConcurrentArenas=" + requested]),
        ...(safe === undefined || safe === null
          ? []
          : ["safeConcurrentArenas=" + safe]),
      ],
    });
  }

  if (source.arena.lifecycle !== undefined) {
    runtimeSurfaces.push({
      id: "runtime:arena-lifecycle",
      label: "Arena lifecycle",
      kind: "runtime-domain",
      status:
        source.arena.lifecycle.unresolved > 0
          ? "unknown"
          : "understood",
      material: true,
      ...(source.arena.lifecycle.unresolved > 0
        ? { reason: "Arena lifecycle has unresolved terminal/transition evidence." }
        : {}),
    });
  }

  if (source.arena.cleanupSurfaces !== undefined) {
    const unresolved =
      source.arena.cleanupSurfaces.unresolved > 0 ||
      (source.arena.cleanupSurfaces.ledger?.missing ?? 0) > 0;
    runtimeSurfaces.push({
      id: "runtime:arena-cleanup",
      label: "Arena cleanup and reuse",
      kind: "runtime-domain",
      status: unresolved ? "unknown" : "understood",
      material: true,
      ...(unresolved
        ? { reason: "Arena cleanup/reuse coverage is incomplete." }
        : {}),
    });
  }

  const replicaProof =
    source.arena.replicaProofQuality ?? [];
  if (replicaProof.length > 0) {
    const incomplete = replicaProof.filter(
      (item) =>
        item.status === "incomplete-proof" ||
        item.status === "budget-exceeded" ||
        item.status === "no-proof",
    ).length;
    const diverged = replicaProof.filter(
      (item) => item.status === "diverged",
    ).length;

    runtimeSurfaces.push({
      id: "runtime:arena-replica-integrity",
      label: "Arena replica integrity",
      kind: "runtime-domain",
      status:
        incomplete > 0
          ? "unknown"
          : "understood",
      material: true,
      ...(incomplete > 0
        ? {
            reason:
              String(incomplete) +
              " arena replica proof(s) remain incomplete or unavailable.",
          }
        : {}),
      boundaries: [
        "replicaCount=" +
          String(replicaProof.length),
        "divergedReplicas=" +
          String(diverged),
      ],
    });
  }

  if (source.arena.stateIsolation !== undefined) {
    runtimeSurfaces.push({
      id: "runtime:arena-isolation",
      label: "Arena state isolation",
      kind: "runtime-domain",
      status:
        source.arena.stateIsolation.unknown > 0 ||
        source.arena.stateIsolation.partitionProofRequired > 0
          ? "unknown"
          : "understood",
      material: true,
      ...(
        source.arena.stateIsolation.unknown > 0 ||
        source.arena.stateIsolation.partitionProofRequired > 0
          ? { reason: "Arena isolation still requires unresolved partition proof." }
          : {}
      ),
    });
  }

  const persistenceApplicable =
    (source.persistenceSource?.properties.length ?? 0) > 0;
  if (persistenceApplicable) {
    const unresolved =
      (source.persistenceSource?.unknownScope ?? 0) > 0 ||
      (source.persistenceSource?.unknownLifetime ?? 0) > 0;
    runtimeSurfaces.push({
      id: "runtime:persistence",
      label: "Persistence and recovery",
      kind: "runtime-domain",
      status: unresolved ? "unknown" : "understood",
      material: true,
      ...(unresolved
        ? { reason: "Persistence scope or lifetime remains unresolved." }
        : {}),
    });
  }

  const economyApplicable =
    (source.rewardSources?.sourceKinds.length ?? 0) > 0;
  if (economyApplicable) {
    const unresolved =
      (source.rewardSources?.unresolvedEngineLootTables ?? 0) > 0 ||
      (source.rewardSources?.deathRewardSourceOverlapUnresolved ?? 0) > 0 ||
      (source.economyPolicy?.deathRewardOverlapUnresolved ?? 0) > 0;
    runtimeSurfaces.push({
      id: "runtime:economy",
      label: "Economy and rewards",
      kind: "runtime-domain",
      status: unresolved ? "unknown" : "understood",
      material: true,
      ...(unresolved
        ? { reason: "Material reward/economy behavior remains unresolved." }
        : {}),
    });
  }

  const combatApplicable =
    (source.combatLifecycle?.hurtHandlers ?? 0) > 0 ||
    (source.combatLifecycle?.deathHandlers ?? 0) > 0 ||
    (source.combatLifecycle?.damageApplications ?? 0) > 0;
  if (combatApplicable) {
    runtimeSurfaces.push({
      id: "runtime:combat",
      label: "Combat lifecycle",
      kind: "runtime-domain",
      status: "understood",
      material: true,
    });
  }

  const inventoryApplicable =
    (source.inventoryLifecycle?.regions ?? 0) > 0 ||
    (source.inventoryLifecycle?.grantRegions ?? 0) > 0 ||
    (source.inventoryLifecycle?.resetCandidates ?? 0) > 0;
  if (inventoryApplicable) {
    const unresolved =
      (source.inventoryLifecycle?.unresolvedEquipmentSlotEvidence ?? 0) > 0 ||
      (source.inventoryRestoreOwnership?.unknownIdentityGrants ?? 0) > 0 ||
      (source.inventoryPolicy?.unknownIdentityEvidence ?? 0) > 0 ||
      (source.inventoryPolicy?.unknownDrops ?? 0) > 0;
    runtimeSurfaces.push({
      id: "runtime:inventory",
      label: "Inventory and equipment",
      kind: "runtime-domain",
      status: unresolved ? "unknown" : "understood",
      material: true,
      ...(unresolved
        ? { reason: "Inventory/equipment identity or restore behavior remains unresolved." }
        : {}),
    });
  }

  const spatialApplicable =
    source.scriptSpatial.resolvedEffects.length > 0 ||
    source.scriptSpatial.structurePlacements.length > 0 ||
    source.scriptSpatial.failures.length > 0;
  if (spatialApplicable) {
    const unresolved =
      source.scriptSpatial.failures.length > 0 ||
      (source.spatialAuthority?.uncovered ?? 0) > 0 ||
      (source.spatialAuthority?.conflicts ?? 0) > 0 ||
      (source.spatialAuthority?.unknownRegions ?? 0) > 0;
    runtimeSurfaces.push({
      id: "runtime:spatial",
      label: "Spatial authority and world placement",
      kind: "runtime-domain",
      status: unresolved ? "unknown" : "understood",
      material: true,
      ...(unresolved
        ? { reason: "Spatial mutation/authority evidence remains unresolved." }
        : {}),
    });
  }

  if (
    source.structures.loads > 0 ||
    source.structures.runtimeLogicLoads > 0 ||
    (source.structures.transitionResidueRisks ?? 0) > 0 ||
    (source.structures.transitionResidueUnresolved ?? 0) > 0
  ) {
    const unresolved =
      source.structures.unresolvedLoads > 0 ||
      (source.structures.transitionResidueRisks ?? 0) > 0 ||
      (source.structures.transitionResidueUnresolved ?? 0) > 0;
    runtimeSurfaces.push({
      id: "runtime:structures",
      label: "Structure and world mutation",
      kind: "runtime-domain",
      status:
        unresolved
          ? "unknown"
          : "understood",
      material: true,
      ...(unresolved
        ? {
            reason:
              (source.structures.transitionResidueRisks ?? 0) > 0
                ? "Structure transitions contain residue-risk cells and require baseline/reset proof."
                : "One or more structure loads or transition states remain unresolved.",
          }
        : {}),
    });
  }

  if (source.entities.definitions > 0) {
    const unresolved =
      source.entities.knowledgePrerequisiteGaps > 0 ||
      source.entities.staticAnalysisLimits > 0 ||
      (source.routeNavigationEnvironment?.unresolved ?? 0) > 0;
    runtimeSurfaces.push({
      id: "runtime:entities",
      label: "Entity lifecycle and navigation",
      kind: "runtime-domain",
      status: unresolved ? "unknown" : "understood",
      material: true,
      ...(unresolved
        ? { reason: "Entity lifecycle/navigation has unresolved analysis limits." }
        : {}),
    });
  }

  const stateEvidence =
    source.semanticIr.stateSurfaces > 0 ||
    source.semanticIr.stateOperations > 0;
  if (stateEvidence) {
    runtimeSurfaces.push({
      id: "runtime:state",
      label: "Gameplay state authority",
      kind: "runtime-domain",
      status: "understood",
      material: true,
    });
  }

  const chunkEvidence =
    source.chunkLifecycle !== undefined &&
    (
      source.chunkLifecycle.worldLoadObservers > 0 ||
      source.chunkLifecycle.entityLoadObservers > 0 ||
      source.chunkLifecycle.tickingAreaAcquires > 0 ||
      source.chunkLifecycle.readinessProbes > 0
    );
  if (chunkEvidence) {
    runtimeSurfaces.push({
      id: "runtime:chunks",
      label: "Chunk and residency lifecycle",
      kind: "runtime-domain",
      status:
        source.chunkLifecycle?.entityResidencyObservability === "absent"
          ? "unknown"
          : "understood",
      material: true,
      ...(source.chunkLifecycle?.entityResidencyObservability === "absent"
        ? { reason: "Chunk/entity residency is gameplay-relevant but observability is absent." }
        : {}),
    });
  }

  const boundaryEvidence =
    (source.boundaries?.records ?? 0) > 0 ||
    (source.boundaries?.unresolvedNames.length ?? 0) > 0;
  if (boundaryEvidence) {
    const unresolved =
      (source.boundaries?.unresolvedNames.length ?? 0) > 0;
    runtimeSurfaces.push({
      id: "runtime:boundaries",
      label: "Gameplay numeric and discrete boundaries",
      kind: "runtime-domain",
      status: unresolved ? "unknown" : "understood",
      material: true,
      ...(unresolved
        ? {
            reason:
              "One or more gameplay boundary values could not be resolved: " +
              (source.boundaries?.unresolvedNames.join(", ") ?? "unknown") +
              ".",
          }
        : {}),
    });
  }

  const intentSurfaces =
    buildIntentClosureSurfaces(source.intent);
  const closureSurfaces = [
    ...intentSurfaces,
    ...runtimeSurfaces,
  ];

  const stateClosure =
    assessGameplayStateClosure(
      source.intent,
    );
  const stateModelComplete =
    stateClosure.complete;

  const arenaBoundariesExtracted =
    !arenaDetected ||
    (
      arenaCount !== undefined &&
      source.arena.capacity?.evidence
        .requestedConcurrentArenas !== undefined
    );
  const genericBoundariesExtracted =
    (source.boundaries?.unresolvedNames.length ?? 0) === 0;
  const boundariesExtracted =
    arenaBoundariesExtracted &&
    genericBoundariesExtracted;

  const discovery = discoverGameplaySurfaces({
    intentSubjectIds:
      source.intent.nodes.map((node) => node.id),
    arenaDetected,
    arenaCapacityEvidence:
      source.arena.capacity !== undefined ||
      arenaCount !== undefined,
    arenaLifecycleEvidence:
      source.arena.lifecycle !== undefined,
    arenaCleanupEvidence:
      source.arena.cleanupSurfaces !== undefined,
    arenaIsolationEvidence:
      source.arena.stateIsolation !== undefined ||
      source.arena.globalState !== undefined,
    stateEvidence,
    chunkEvidence,
    persistenceEvidence: persistenceApplicable,
    economyEvidence: economyApplicable,
    combatEvidence: combatApplicable,
    inventoryEvidence: inventoryApplicable,
    spatialEvidence: spatialApplicable,
    structureEvidence:
      source.structures.definitions > 0 ||
      source.structures.loads > 0 ||
      source.structures.runtimeLogicLoads > 0,
    entityEvidence:
      source.entities.definitions > 0,
    boundaryEvidence,
  });

  const gameplayClosure =
    assessGameplayModelClosure({
      discoveredSurfaceIds: discovery.surfaceIds,
      surfaces: closureSurfaces,
      stateModelComplete,
      boundariesExtracted,
    });

  return {
    schemaVersion: 1,
    artifactId: source.artifactId,
    subjects: summarizeSubjects(source.intent),
    gameplayClosure,
    stateClosure,
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
      ...(source.arena.capacity?.report === undefined
        ? {}
        : {
            safeConcurrentArenas:
              source.arena.capacity.report
                .safeConcurrentArenas,
          }),
      ...(source.arena.capacity?.evidence
          .declaredConcurrentArenaLimit === undefined
        ? {}
        : {
            declaredConcurrentArenaLimit:
              source.arena.capacity.evidence
                .declaredConcurrentArenaLimit,
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
      ...(source.arena.repeatedRunPlan === undefined
        ? {}
        : {
            repeatedRun: {
              runCounts: [
                ...source.arena.repeatedRunPlan
                  .runCounts,
              ],
              stages:
                source.arena.repeatedRunPlan
                  .stages.length,
              compareSurfaces: [
                ...new Set(
                  source.arena.repeatedRunPlan
                    .stages.flatMap(
                      (stage) =>
                        stage.compareSurfaces,
                    ),
                ),
              ].sort(),
            },
          }),
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
      replicaIntegrity: {
        complete:
          replicaProof.filter(
            (item) =>
              item.status === "complete-proof",
          ).length,
        bounded:
          replicaProof.filter(
            (item) =>
              item.status === "bounded-proof",
          ).length,
        diverged:
          replicaProof.filter(
            (item) =>
              item.status === "diverged",
          ).length,
        incomplete:
          replicaProof.filter(
            (item) =>
              item.status === "incomplete-proof" ||
              item.status === "budget-exceeded",
          ).length,
        noProof:
          replicaProof.filter(
            (item) =>
              item.status === "no-proof",
          ).length,
      },
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
    persistence: {
      properties:
        source.persistenceSource?.properties.length ?? 0,
      appendWithoutClear:
        source.persistenceSource?.appendWithoutClear ?? 0,
      worldScopedAppendWithoutClear:
        source.persistenceSource?.worldScopedAppendWithoutClear ?? 0,
      unknownScope:
        source.persistenceSource?.unknownScope ?? 0,
      unknownLifetime:
        source.persistenceSource?.unknownLifetime ?? 0,
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
      cleanupOrderUnproven:
        source.chunkLifecycle?.cleanupOrderUnproven ?? 0,
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
      deathRewardSourceOverlapUnresolved:
        source.rewardSources
          ?.deathRewardSourceOverlapUnresolved ?? 0,
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
        deathRewardOverlapContractConflicts:
          source.economyPolicy
            ?.deathRewardOverlapContractConflicts ?? 0,
        deathRewardOverlapUnresolved:
          source.economyPolicy
            ?.deathRewardOverlapUnresolved ?? 0,
        pickupCurrencyConsumeCoverageGaps:
          source.economyPolicy
            ?.pickupCurrencyConsumeCoverageGaps ?? 0,
        pickupCurrencyContractMismatch:
          source.economyPolicy
            ?.pickupCurrencyContractMismatch ?? 0,
        idempotencyCoverageGaps:
          source.economyPolicy
            ?.idempotencyCoverageGaps ?? 0,
        staleDropCleanupCoverageGaps:
          source.economyPolicy
            ?.staleDropCleanupCoverageGaps ?? 0,
        inventoryFullContractGaps:
          source.economyPolicy
            ?.inventoryFullContractGaps ?? 0,
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
        reviveContractContradictions:
          source.combatPolicy?.reviveContractContradictions ?? 0,
        projectileCleanupContractGap:
          source.combatPolicy?.projectileCleanupContractGap ?? 0,
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
      transitionResidueRisks:
        source.structures
          .transitionResidueRisks ?? 0,
      transitionResidueUnresolved:
        source.structures
          .transitionResidueUnresolved ?? 0,
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
