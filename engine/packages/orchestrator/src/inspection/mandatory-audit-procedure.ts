import type { SemanticIr } from "../../../semantic-ir/src/index.js";
import type { GameplayIntentModel } from "../../../gameplay-intent/src/index.js";
import type { GameplayWorldModel } from "./gameplay-world-model.js";
import type { GameplayDiscoveryClosure } from "./gameplay-discovery-closure.js";
import type { GameplayBoundaryRegistry } from "./gameplay-boundary-registry.js";
import type { MultiplayerStateValidationPlan } from "./multiplayer-state-validation.js";
import type { HiddenGameplayDefectAnalysis } from "./hidden-gameplay-defect-analysis.js";

export type MandatoryAuditBlock =
  | "UNDERSTAND"
  | "MODEL"
  | "STRESS"
  | "PROVE"
  | "REPORT";

export type MandatoryAuditCheckpointStatus =
  | "CLOSED"
  | "PARTIAL"
  | "OPEN"
  | "NOT_APPLICABLE";

export type MandatoryAuditCheckpointReasonCode =
  | "COMPLETE"
  | "NOT_APPLICABLE_PROVEN"
  | "RUNTIME_PROOF_REQUIRED"
  | "DISCOVERY_INCOMPLETE"
  | "SCOPE_INCOMPLETE"
  | "OBLIGATION_INCOMPLETE"
  | "KNOWLEDGE_GAP"
  | "CAPABILITY_GAP"
  | "PROCEDURE_BLOCKED";

export interface MandatoryAuditObligation {
  readonly id: string;
  readonly required: boolean;
  readonly satisfied: boolean;
  readonly evidenceIds: readonly string[];
  readonly reason: string;
}

export interface MandatoryAuditCheckpointReceipt {
  readonly id: string;
  readonly block: MandatoryAuditBlock;
  readonly label: string;
  readonly status: MandatoryAuditCheckpointStatus;
  readonly reasonCode: MandatoryAuditCheckpointReasonCode;
  readonly blocksPublication: boolean;
  readonly obligations: readonly MandatoryAuditObligation[];
  readonly evidenceIds: readonly string[];
  readonly outputIds: readonly string[];
  readonly reason: string;
}

export interface MandatoryAuditBlockClosure {
  readonly block: MandatoryAuditBlock;
  readonly status: Exclude<
    MandatoryAuditCheckpointStatus,
    "NOT_APPLICABLE"
  >;
  readonly checkpointIds: readonly string[];
  readonly openCheckpointIds: readonly string[];
  readonly partialCheckpointIds: readonly string[];
}

export interface MandatoryAuditStateRecord {
  readonly surfaceId: string;
  readonly readRegions: readonly string[];
  readonly writeRegions: readonly string[];
  readonly clearRegions: readonly string[];
  readonly authorityContractIds: readonly string[];
}

export interface MandatoryAuditOwnershipRecord {
  readonly authorityContractId: string;
  readonly authoritySurfaceId: string;
  readonly mirrorSurfaceIds: readonly string[];
}

export interface MandatoryAuditProgressionRecord {
  readonly subjectId: string;
  readonly inboundEdgeIds: readonly string[];
  readonly outboundEdgeIds: readonly string[];
}

export interface MandatoryAuditProcedureReceipt {
  readonly schemaVersion: 1;
  readonly policy: "mandatory-gameplay-audit-procedure";
  readonly checkpoints: readonly MandatoryAuditCheckpointReceipt[];
  readonly blocks: readonly MandatoryAuditBlockClosure[];
  readonly status: "CLOSED" | "PARTIAL" | "OPEN";
  readonly stateRegistry: readonly MandatoryAuditStateRecord[];
  readonly ownershipRegistry: readonly MandatoryAuditOwnershipRecord[];
  readonly progressionContracts: readonly MandatoryAuditProgressionRecord[];
  readonly blockingCheckpointIds: readonly string[];
  readonly reasons: readonly string[];
}

function receipt(
  id: string,
  block: MandatoryAuditBlock,
  label: string,
  status: MandatoryAuditCheckpointStatus,
  reason: string,
  evidenceIds: readonly string[] = [],
  outputIds: readonly string[] = [],
  options: {
    readonly reasonCode?: MandatoryAuditCheckpointReasonCode;
    readonly blocksPublication?: boolean;
    readonly obligations?: readonly MandatoryAuditObligation[];
  } = {},
): MandatoryAuditCheckpointReceipt {
  const obligations = options.obligations ?? [];
  const unsatisfiedRequired = obligations.some(
    (item) => item.required && !item.satisfied,
  );
  const effectiveStatus =
    status === "CLOSED" && unsatisfiedRequired
      ? "PARTIAL"
      : status;
  return {
    id,
    block,
    label,
    status: effectiveStatus,
    reasonCode:
      options.reasonCode ??
      (effectiveStatus === "NOT_APPLICABLE"
        ? "NOT_APPLICABLE_PROVEN"
        : effectiveStatus === "CLOSED"
          ? "COMPLETE"
          : "OBLIGATION_INCOMPLETE"),
    blocksPublication:
      options.blocksPublication ??
      (
        effectiveStatus === "OPEN" ||
        (
          effectiveStatus === "PARTIAL" &&
          (options.reasonCode ?? "OBLIGATION_INCOMPLETE") !==
            "RUNTIME_PROOF_REQUIRED"
        )
      ),
    obligations,
    reason,
    evidenceIds: [...new Set(evidenceIds)].sort(),
    outputIds: [...new Set(outputIds)].sort(),
  };
}

function obligation(
  id: string,
  required: boolean,
  satisfied: boolean,
  reason: string,
  evidenceIds: readonly string[] = [],
): MandatoryAuditObligation {
  return {
    id,
    required,
    satisfied,
    reason,
    evidenceIds: [...new Set(evidenceIds)].sort(),
  };
}

function positiveNotApplicable(
  discovery: GameplayDiscoveryClosure,
  hasIntentSignal: boolean,
  hasRuntimeSignal: boolean,
): boolean {
  return (
    discovery.status === "COMPLETE" &&
    !hasIntentSignal &&
    !hasRuntimeSignal
  );
}

function deriveStateRegistry(
  ir: SemanticIr,
): readonly MandatoryAuditStateRecord[] {
  return ir.state.surfaces.map((surface) => {
    const operations = ir.state.operations.filter(
      (operation) => operation.surfaceId === surface.id,
    );
    const regionsFor = (...kinds: string[]) =>
      [...new Set(
        operations
          .filter((operation) =>
            kinds.includes(operation.operation)
          )
          .map((operation) => operation.executionRegionId),
      )].sort();
    const authorityContractIds =
      ir.state.authorityBindings
        .filter((binding) =>
          binding.authoritySurfaceId === surface.id ||
          binding.mirrorSurfaceIds.includes(surface.id)
        )
        .map((binding) => binding.contract.id)
        .sort();
    return {
      surfaceId: surface.id,
      readRegions: regionsFor("read", "enumerate", "size"),
      writeRegions: regionsFor("write"),
      clearRegions: regionsFor("clear", "delete"),
      authorityContractIds,
    };
  });
}

function deriveOwnershipRegistry(
  ir: SemanticIr,
): readonly MandatoryAuditOwnershipRecord[] {
  return ir.state.authorityBindings.map((binding) => ({
    authorityContractId: binding.contract.id,
    authoritySurfaceId: binding.authoritySurfaceId,
    mirrorSurfaceIds: [...binding.mirrorSurfaceIds].sort(),
  }));
}

function deriveProgressionContracts(
  intent: GameplayIntentModel,
): readonly MandatoryAuditProgressionRecord[] {
  return intent.nodes
    .filter((node) =>
      node.kind === "objective" ||
      node.kind === "phase" ||
      node.kind === "outcome"
    )
    .map((node) => ({
      subjectId: node.id,
      inboundEdgeIds: intent.edges
        .filter((edge) => edge.to === node.id)
        .map((edge) => edge.id)
        .sort(),
      outboundEdgeIds: intent.edges
        .filter((edge) => edge.from === node.id)
        .map((edge) => edge.id)
        .sort(),
    }));
}

function blockClosure(
  block: MandatoryAuditBlock,
  checkpoints: readonly MandatoryAuditCheckpointReceipt[],
): MandatoryAuditBlockClosure {
  const relevant = checkpoints.filter((item) => item.block === block);
  const open = relevant.filter((item) => item.status === "OPEN");
  const partial = relevant.filter((item) => item.status === "PARTIAL");
  return {
    block,
    status:
      open.length > 0
        ? "OPEN"
        : partial.length > 0
          ? "PARTIAL"
          : "CLOSED",
    checkpointIds: relevant.map((item) => item.id),
    openCheckpointIds: open.map((item) => item.id),
    partialCheckpointIds: partial.map((item) => item.id),
  };
}

export function deriveMandatoryAuditProcedureReceipt(input: {
  readonly artifactId: string;
  readonly discovery: GameplayDiscoveryClosure;
  readonly world: GameplayWorldModel;
  readonly intent: GameplayIntentModel;
  readonly semanticIr: SemanticIr;
  readonly boundaries: GameplayBoundaryRegistry;
  readonly multiplayer: MultiplayerStateValidationPlan;
  readonly hidden: HiddenGameplayDefectAnalysis;
}): MandatoryAuditProcedureReceipt {
  const {
    artifactId,
    discovery,
    world,
    intent,
    semanticIr,
    boundaries,
    multiplayer,
    hidden,
  } = input;
  const graph = hidden.scenarioAudit.graph;
  const scenarioClosure = hidden.scenarioAudit.closure;
  const defectResolution = hidden.scenarioAudit.defectResolution;
  const stateRegistry = deriveStateRegistry(semanticIr);
  const ownershipRegistry = deriveOwnershipRegistry(semanticIr);
  const progressionContracts = deriveProgressionContracts(intent);
  const checkpoint: MandatoryAuditCheckpointReceipt[] = [];

  checkpoint.push(receipt(
    "A1",
    "UNDERSTAND",
    "Selected Artifact Integrity",
    artifactId.trim() ? "CLOSED" : "OPEN",
    artifactId.trim()
      ? "Selected artifact identity is present."
      : "Selected artifact identity is missing.",
    artifactId.trim() ? ["artifact:" + artifactId] : [],
    ["SelectedArtifactReceipt"],
  ));

  checkpoint.push(receipt(
    "A2",
    "UNDERSTAND",
    "Gameplay Surface Discovery",
    discovery.status === "OPEN"
      ? "OPEN"
      : discovery.status === "PARTIAL"
        ? "PARTIAL"
        : "CLOSED",
    "Gameplay Discovery Closure is " + discovery.status + ".",
    world.surfaceDiscovery.surfaceIds,
    ["GameplaySurfaceInventory"],
  ));

  const fullJourney = graph.scenarios.find(
    (scenario) => scenario.label === "full-journey",
  );
  checkpoint.push(receipt(
    "A3",
    "UNDERSTAND",
    "Player Journey Reconstruction",
    fullJourney &&
    fullJourney.composedScenarioIds.length > 0 &&
    scenarioClosure.status !== "OPEN" &&
    intent.nodes.some((node) =>
      node.kind === "objective" ||
      node.kind === "phase" ||
      node.kind === "outcome"
    )
      ? "CLOSED"
      : "OPEN",
    fullJourney && fullJourney.composedScenarioIds.length > 0
      ? "Full journey is represented as a composition of concrete gameplay scenarios."
      : "No complete full-journey composition is available.",
    fullJourney?.composedScenarioIds ?? [],
    ["PlayerJourneyGraph"],
    {
      obligations: [
        obligation(
          "journey-composition",
          true,
          (fullJourney?.composedScenarioIds.length ?? 0) > 0,
          "Full journey must compose concrete gameplay scenarios.",
          fullJourney?.composedScenarioIds ?? [],
        ),
        obligation(
          "journey-core-semantics",
          true,
          intent.nodes.some((node) => node.kind === "phase") &&
            intent.nodes.some((node) =>
              node.kind === "objective" ||
              node.kind === "outcome"
            ),
          "Journey must contain grounded phase plus objective/outcome semantics.",
          intent.nodes
            .filter((node) =>
              node.kind === "phase" ||
              node.kind === "objective" ||
              node.kind === "outcome"
            )
            .flatMap((node) => node.evidenceIds),
        ),
        obligation(
          "journey-scenario-closure",
          true,
          scenarioClosure.status !== "OPEN",
          "Journey cannot close while scenario closure is OPEN.",
          graph.causalLinks.flatMap((item) => item.evidenceIds),
        ),
      ],
    },
  ));

  checkpoint.push(receipt(
    "A4",
    "UNDERSTAND",
    "State Registry",
    stateRegistry.length === 0
      ? discovery.status === "COMPLETE"
        ? "NOT_APPLICABLE"
        : "OPEN"
      : "CLOSED",
    stateRegistry.length === 0
      ? discovery.status === "COMPLETE"
        ? "No material Semantic IR state surfaces were discovered after complete discovery."
        : "State applicability cannot be closed while discovery is incomplete."
      : "Material state surfaces are projected with read/write/clear ownership evidence.",
    semanticIr.state.operations.map((item) => item.id),
    ["StateRegistry"],
  ));

  const ownershipApplicable =
    ownershipRegistry.length > 0 ||
    world.arenas.detected ||
    semanticIr.temporal.relations.some(
      (relation) =>
        relation.kind === "deferred" ||
        relation.kind === "periodic",
    );
  checkpoint.push(receipt(
    "A5",
    "UNDERSTAND",
    "Ownership Registry",
    !ownershipApplicable
      ? "NOT_APPLICABLE"
      : ownershipRegistry.length > 0 || world.arenas.detected
        ? "CLOSED"
        : "PARTIAL",
    !ownershipApplicable
      ? "No shared/session/deferred ownership surface was discovered."
      : ownershipRegistry.length > 0 || world.arenas.detected
        ? "Ownership evidence is represented by authority bindings and/or arena lifecycle ownership."
        : "Ownership-sensitive work exists but explicit authority bindings remain incomplete.",
    ownershipRegistry.map((item) => item.authorityContractId),
    ["OwnershipRegistry"],
  ));

  checkpoint.push(receipt(
    "A6",
    "UNDERSTAND",
    "Progression Contract",
    progressionContracts.length === 0
      ? "NOT_APPLICABLE"
      : progressionContracts.every(
          (item) =>
            item.inboundEdgeIds.length > 0 ||
            item.outboundEdgeIds.length > 0,
        )
        ? "CLOSED"
        : "PARTIAL",
    progressionContracts.length === 0
      ? "No objective/phase/outcome progression surfaces were discovered."
      : "Objective/phase/outcome progression edges are projected from gameplay intent.",
    progressionContracts.flatMap((item) => [
      ...item.inboundEdgeIds,
      ...item.outboundEdgeIds,
    ]),
    ["ProgressionContracts"],
  ));

  checkpoint.push(receipt(
    "B1",
    "MODEL",
    "Actor / Entity Contract",
    world.entities.definitions === 0
      ? positiveNotApplicable(
          discovery,
          intent.nodes.some((node) =>
            node.kind === "actor" || node.kind === "role"
          ),
          false,
        )
        ? "NOT_APPLICABLE"
        : "OPEN"
      : world.entities.staticAnalysisLimits > 0 ||
          world.entities.navigationEnvironment.unresolved > 0
        ? "PARTIAL"
        : "CLOSED",
    world.entities.definitions === 0
      ? discovery.status === "COMPLETE"
        ? "No actor/role intent or entity definition remains after complete discovery."
        : "Entity applicability is unresolved while discovery remains incomplete."
      : "Entity behavior/navigation evidence is accounted.",
    ["analysis:entity-behavior"],
    ["ActorEntityContract"],
  ));

  const spatialApplicable =
    world.spatial.resolvedScriptEffects > 0 ||
    world.spatial.structurePlacements > 0 ||
    world.chunks.leases.length > 0;
  checkpoint.push(receipt(
    "B2",
    "MODEL",
    "Spatial & Simulation Contract",
    !spatialApplicable
      ? "NOT_APPLICABLE"
      : world.chunks.cleanupOrderUnproven > 0 ||
          world.chunks.readinessUnverifiedLeases > 0
        ? "PARTIAL"
        : "CLOSED",
    !spatialApplicable
      ? "No material spatial/simulation dependency was discovered."
      : "Spatial and chunk/simulation ownership evidence is accounted.",
    [
      "analysis:spatial-authority",
      "analysis:chunk-simulation",
      "analysis:platform-constraints",
    ],
    ["SpatialSimulationContract"],
    {
      obligations: [
        obligation(
          "platform-knowledge-resolved",
          spatialApplicable,
          world.platformKnowledge.profileResolved,
          "Runtime-sensitive spatial/simulation reasoning requires resolved Minecraft/Education platform knowledge.",
          world.platformKnowledge.profileResolved
            ? ["analysis:platform-constraints"]
            : [],
        ),
        obligation(
          "chunk-knowledge-executed",
          world.chunks.leases.length > 0 ||
            graph.knowledgeRequirements.some(
              (item) => item.domain === "chunk-simulation"
            ),
          world.analysisExecution.executedCapabilityIds.includes(
            "chunk-lifecycle-integrity",
          ),
          "Required chunk/simulation knowledge must execute when the scenario depends on it.",
          ["analysis:chunk-simulation"],
        ),
      ],
    },
  ));

  checkpoint.push(receipt(
    "B3",
    "MODEL",
    "Multiplayer Contract",
    !multiplayer.applicable
      ? (
          discovery.status === "COMPLETE" &&
          !world.arenas.detected &&
          !graph.scenarios.some((scenario) =>
            scenario.playerCounts.some((count) => count > 1)
          )
        )
        ? "NOT_APPLICABLE"
        : "OPEN"
      : multiplayer.scenarios.length > 0
        ? "CLOSED"
        : "PARTIAL",
    !multiplayer.applicable
      ? discovery.status === "COMPLETE"
        ? "No multiplayer signal remains after complete discovery and no multi-player scenario count is present."
        : "Multiplayer applicability cannot close while discovery is incomplete."
      : "Applicable mixed-player scenarios are compiled.",
    multiplayer.scenarios.map((item) => item.id),
    ["MultiplayerContract"],
    {
      obligations: [
        obligation(
          "multiplayer-scenarios-compiled",
          multiplayer.applicable,
          multiplayer.scenarios.length > 0,
          "Applicable multiplayer requires at least one mixed-player scenario.",
          multiplayer.scenarios.map((item) => item.id),
        ),
        obligation(
          "multiplayer-knowledge-executed",
          multiplayer.applicable,
          world.analysisExecution.executedCapabilityIds.includes(
            "multiplayer-interleaving",
          ) || !world.arenas.detected,
          "Arena/shared multiplayer must execute interleaving/isolation analysis.",
          ["analysis:multiplayer-interleaving"],
        ),
      ],
    },
  ));

  const multiArena =
    world.arenas.detected && (world.arenas.count ?? 0) > 1;
  checkpoint.push(receipt(
    "B4",
    "MODEL",
    "Multi-Arena Contract",
    !multiArena
      ? (
          discovery.status === "COMPLETE" &&
          (
            !world.arenas.detected ||
            world.arenas.count === 1
          )
        )
        ? "NOT_APPLICABLE"
        : "OPEN"
      : world.arenas.safeConcurrentArenas == null ||
          world.arenas.isolation.unknown > 0
        ? "PARTIAL"
        : "CLOSED",
    !multiArena
      ? discovery.status === "COMPLETE"
        ? "Complete discovery supports a single/no-arena model."
        : "Multi-arena applicability cannot close while discovery is incomplete or arena count is unresolved."
      : "Arena capacity and isolation obligations are accounted.",
    ["analysis:arena-lifecycle", "analysis:multiplayer-interleaving"],
    ["MultiArenaContract"],
    {
      obligations: [
        obligation(
          "arena-count-resolved",
          multiArena,
          world.arenas.count !== undefined,
          "Multi-arena requires a resolved visible arena count.",
          ["world:arena-count"],
        ),
        obligation(
          "arena-concurrency-resolved",
          multiArena,
          world.arenas.safeConcurrentArenas !== undefined &&
            world.arenas.safeConcurrentArenas !== null,
          "Multi-arena requires resolved playable concurrent capacity.",
          ["capacity:safe-concurrency"],
        ),
        obligation(
          "arena-isolation-analyzed",
          multiArena,
          world.analysisExecution.executedCapabilityIds.includes(
            "multiplayer-interleaving",
          ) &&
          world.arenas.isolation.unknown === 0,
          "Multi-arena requires scoped isolation analysis with no unknown ownership.",
          ["analysis:multiplayer-interleaving"],
        ),
        obligation(
          "arena-lifecycle-analyzed",
          multiArena,
          world.analysisExecution.executedCapabilityIds.includes(
            "arena-lifecycle-integrity",
          ),
          "Multi-arena requires lifecycle/cleanup analysis.",
          ["analysis:arena-lifecycle"],
        ),
      ],
    },
  ));

  checkpoint.push(receipt(
    "B5",
    "MODEL",
    "Boundary Registry",
    boundaries.records.length === 0 &&
      boundaries.unresolvedNames.length === 0
      ? "NOT_APPLICABLE"
      : boundaries.unresolvedNames.length > 0
        ? "PARTIAL"
        : "CLOSED",
    boundaries.unresolvedNames.length > 0
      ? "Material boundary names remain unresolved: " +
        boundaries.unresolvedNames.join(", ") + "."
      : "Material boundaries are extracted with edge cases.",
    boundaries.records.map((item) => item.id),
    ["BoundaryRegistry"],
  ));

  const combatApplicable =
    world.combat.hurtHandlers > 0 ||
    world.combat.deathHandlers > 0 ||
    world.combat.damageApplications > 0;
  checkpoint.push(receipt(
    "C1",
    "STRESS",
    "Combat Lifecycle",
    combatApplicable
      ? "CLOSED"
      : positiveNotApplicable(
          discovery,
          intent.nodes.some((node) =>
            /combat|damage|death|revive|downed/i.test(
              node.id + " " + node.label,
            )
          ),
          false,
        )
        ? "NOT_APPLICABLE"
        : "OPEN",
    combatApplicable
      ? "Combat lifecycle obligations are evaluated; contradictions flow into PROVE."
      : discovery.status === "COMPLETE"
        ? "No combat intent or runtime combat surface remains after complete discovery."
        : "Combat applicability is unresolved while discovery is incomplete.",
    ["analysis:combat-lifecycle"],
    ["CombatLifecycleContract"],
    {
      obligations: [
        obligation(
          "combat-capability-executed",
          combatApplicable,
          world.analysisExecution.executedCapabilityIds.includes(
            "combat-lifecycle-contract",
          ),
          "Combat capability must execute when combat is applicable.",
          ["analysis:combat-lifecycle"],
        ),
        obligation(
          "combat-path-accounted",
          combatApplicable,
          world.combat.paths.length > 0 ||
            world.combat.policy.reviveContractContradictions > 0,
          "Applicable combat requires at least one scoped combat path or explicit contract contradiction.",
          world.combat.paths.map((item) =>
            item.scriptId + ":" + item.callbackRegion
          ),
        ),
      ],
    },
  ));

  const inventoryApplicable =
    world.inventory.regions > 0 ||
    world.inventory.grantRegions > 0 ||
    world.inventory.dropRegions > 0;
  checkpoint.push(receipt(
    "C2",
    "STRESS",
    "Inventory Lifecycle",
    inventoryApplicable
      ? "CLOSED"
      : positiveNotApplicable(
          discovery,
          intent.nodes.some((node) =>
            /inventory|item|equipment|loadout/i.test(
              node.id + " " + node.label,
            )
          ),
          false,
        )
        ? "NOT_APPLICABLE"
        : "OPEN",
    inventoryApplicable
      ? "Inventory lifecycle obligations are evaluated."
      : discovery.status === "COMPLETE"
        ? "No inventory intent or lifecycle surface remains after complete discovery."
        : "Inventory applicability is unresolved while discovery is incomplete.",
    ["analysis:inventory-state"],
    ["InventoryLifecycleContract"],
    {
      obligations: [
        obligation(
          "inventory-capability-executed",
          inventoryApplicable,
          world.analysisExecution.executedCapabilityIds.includes(
            "inventory-lifecycle-integrity",
          ),
          "Inventory capability must execute when inventory is applicable.",
          ["analysis:inventory-state"],
        ),
        obligation(
          "inventory-scoped-assessment",
          inventoryApplicable,
          world.inventory.assessments.length > 0,
          "Applicable inventory must expose scoped lifecycle assessment.",
          world.inventory.assessments.map((item) =>
            item.scriptId + ":" + item.executionRegion
          ),
        ),
      ],
    },
  ));

  const economyApplicable = world.economy.sourceKinds.length > 0;
  checkpoint.push(receipt(
    "C3",
    "STRESS",
    "Reward / Economy Contract",
    economyApplicable
      ? "CLOSED"
      : positiveNotApplicable(
          discovery,
          intent.nodes.some((node) =>
            /reward|loot|coin|currency|score|shop/i.test(
              node.id + " " + node.label,
            )
          ),
          false,
        )
        ? "NOT_APPLICABLE"
        : "OPEN",
    economyApplicable
      ? "Reward/economy obligations are evaluated."
      : discovery.status === "COMPLETE"
        ? "No reward/economy intent or source remains after complete discovery."
        : "Reward/economy applicability is unresolved while discovery is incomplete.",
    ["analysis:economy-reward"],
    ["RewardEconomyContract"],
    {
      obligations: [
        obligation(
          "economy-capability-executed",
          economyApplicable,
          world.analysisExecution.executedCapabilityIds.includes(
            "economy-reward-integrity",
          ),
          "Economy capability must execute when reward/economy is applicable.",
          ["analysis:economy-reward"],
        ),
        obligation(
          "economy-path-accounted",
          economyApplicable,
          world.economy.paths.length > 0 ||
            world.economy.engineLootEntities > 0 ||
            world.economy.functionLootCommands > 0,
          "Applicable reward/economy requires a scoped reward path or explicit engine/function reward source.",
          world.economy.paths.map((item) =>
            item.scriptId + ":" + item.callbackRegion
          ),
        ),
      ],
    },
  ));

  const persistenceApplicable = (world.persistence?.properties ?? 0) > 0;
  checkpoint.push(receipt(
    "C4",
    "STRESS",
    "Persistence Matrix",
    persistenceApplicable
      ? (world.persistence?.unknownScope ?? 0) > 0 ||
        (world.persistence?.unknownLifetime ?? 0) > 0
        ? "PARTIAL"
        : "CLOSED"
      : "NOT_APPLICABLE",
    persistenceApplicable
      ? "Persistence scope/lifetime evidence is projected across lifecycle boundaries."
      : "No persistent gameplay state was discovered.",
    ["analysis:persistence-recovery"],
    ["PersistenceMatrix"],
  ));

  const deferredRelations = semanticIr.temporal.relations.filter(
    (relation) =>
      relation.kind === "deferred" ||
      relation.kind === "periodic",
  );
  checkpoint.push(receipt(
    "C5",
    "STRESS",
    "Deferred Work Registry",
    deferredRelations.length > 0 ? "CLOSED" : "NOT_APPLICABLE",
    deferredRelations.length > 0
      ? "Deferred/periodic work is enumerated with guard evidence; unsafe work flows into contradiction analysis."
      : "No deferred/periodic gameplay work was discovered.",
    deferredRelations.map((item) => item.id),
    ["DeferredWorkRegistry"],
    {
      obligations: [
        obligation(
          "deferred-relations-enumerated",
          deferredRelations.length > 0,
          deferredRelations.length > 0,
          "Deferred/periodic relations must be enumerated.",
          deferredRelations.map((item) => item.id),
        ),
        obligation(
          "deferred-ownership-analysis",
          deferredRelations.length > 0,
          world.analysisExecution.executedCapabilityIds.includes(
            "temporal-ownership-integrity",
          ),
          "Deferred work requires temporal ownership analysis.",
          ["analysis:temporal-ownership"],
        ),
      ],
    },
  ));

  const terminalScenario = graph.scenarios.find(
    (scenario) => scenario.label === "terminal-collision",
  );
  checkpoint.push(receipt(
    "C6",
    "STRESS",
    "Terminal Ownership",
    terminalScenario
      ? "CLOSED"
      : "NOT_APPLICABLE",
    terminalScenario
      ? "Terminal collision scenario is compiled and routed through causal analysis."
      : "No materially competing terminal scenario was activated.",
    terminalScenario ? [terminalScenario.id] : [],
    ["TerminalCollisionMatrix"],
  ));

  const cleanupApplicable =
    world.arenas.cleanup.acquiredSurfaces > 0 ||
    world.arenas.cleanup.resourceLedger.resources > 0;
  checkpoint.push(receipt(
    "C7",
    "STRESS",
    "Cleanup Ledger",
    !cleanupApplicable
      ? "NOT_APPLICABLE"
      : world.arenas.cleanup.resourceLedger.missing > 0 ||
          world.arenas.cleanup.unresolved > 0
        ? "PARTIAL"
        : "CLOSED",
    cleanupApplicable
      ? "Cleanup resources and terminal coverage are accounted."
      : "No material acquired cleanup resource was discovered.",
    ["analysis:arena-lifecycle"],
    ["CleanupLedger"],
    {
      obligations: [
        obligation(
          "cleanup-ledger-complete",
          cleanupApplicable,
          world.arenas.cleanup.resourceLedger.missing === 0 &&
            world.arenas.cleanup.unresolved === 0,
          "Every acquired cleanup resource must be accounted on applicable terminal paths.",
          ["analysis:arena-lifecycle"],
        ),
      ],
    },
  ));

  const repeated = graph.scenarios.find(
    (scenario) => scenario.label === "repeated-run",
  );
  checkpoint.push(receipt(
    "C8",
    "STRESS",
    "Second-Run Equivalence",
    repeated ? "CLOSED" : "NOT_APPLICABLE",
    repeated
      ? "Repeated-run scenario is compiled and checked through shared lifecycle dependencies."
      : "Replay/reuse scenario was not applicable.",
    repeated ? [repeated.id] : [],
    ["SecondRunEquivalenceAssessment"],
    {
      obligations: [
        obligation(
          "repeated-run-scenario",
          repeated !== undefined,
          repeated !== undefined,
          "Replay/reuse requires a repeated-run scenario.",
          repeated ? [repeated.id] : [],
        ),
        obligation(
          "repeated-run-dependencies-resolved",
          repeated !== undefined,
          repeated === undefined ||
            repeated.requiredKnowledgeIds.every((id) =>
              graph.knowledgeReceipts.some(
                (receipt) =>
                  receipt.requirementId === id &&
                  receipt.status === "SATISFIED"
              )
            ),
          "Repeated-run scenario requires all applicable cleanup/state/world dependencies to return satisfied receipts.",
          repeated?.requiredKnowledgeIds ?? [],
        ),
      ],
    },
  ));

  const crossSystemScenarios = graph.scenarios.filter(
    (scenario) =>
      [
        "disconnect-reconnect",
        "reload-recovery",
        "deferred-ownership",
        "terminal-collision",
        "multi-arena-parallel",
        "repeated-run",
      ].includes(scenario.label),
  );
  checkpoint.push(receipt(
    "C9",
    "STRESS",
    "Cross-System Activation",
    crossSystemScenarios.length > 0
      ? "CLOSED"
      : "NOT_APPLICABLE",
    crossSystemScenarios.length > 0
      ? "Applicable cross-system scenario families are activated."
      : "No high-value cross-system intersection was activated.",
    crossSystemScenarios.map((item) => item.id),
    ["ActivatedCrossSystemScenarioSet"],
  ));

  checkpoint.push(receipt(
    "D1",
    "PROVE",
    "Required Inspection Graph",
    scenarioClosure.missingRequiredKnowledgeIds.length > 0 ||
      scenarioClosure.capabilityGapKnowledgeIds.length > 0 ||
      scenarioClosure.prerequisiteBlockedKnowledgeIds.length > 0
      ? "OPEN"
      : "CLOSED",
    "RIG knowledge receipts are evaluated fail-closed.",
    graph.knowledgeReceipts.flatMap((item) => item.evidenceIds),
    ["RequiredInspectionGraph"],
  ));

  checkpoint.push(receipt(
    "D2",
    "PROVE",
    "Contradiction Admission",
    scenarioClosure.status === "OPEN"
      ? "OPEN"
      : scenarioClosure.status === "PARTIAL"
        ? "PARTIAL"
        : "CLOSED",
    "Gameplay causal links are resolved to scenario-level proof states.",
    graph.causalLinks.flatMap((item) => item.evidenceIds),
    ["GameplayCausalLinks"],
  ));

  checkpoint.push(receipt(
    "D3",
    "PROVE",
    "Counter-Proof Search",
    defectResolution.counterProofSearchRequiredIds.length > 0 ||
      defectResolution.gameplayTranslationRequiredIds.length > 0
      ? "OPEN"
      : defectResolution.runtimeProofRequiredIds.length > 0
        ? "PARTIAL"
        : "CLOSED",
    "Every contradiction is routed through Gameplay Defect Resolution.",
    defectResolution.resolutions.flatMap(
      (item) => item.counterProofEvidenceIds ?? [],
    ),
    ["GameplayDefectResolution"],
    {
      reasonCode:
        defectResolution.runtimeProofRequiredIds.length > 0 &&
        defectResolution.counterProofSearchRequiredIds.length === 0 &&
        defectResolution.gameplayTranslationRequiredIds.length === 0
          ? "RUNTIME_PROOF_REQUIRED"
          : defectResolution.counterProofSearchRequiredIds.length > 0 ||
              defectResolution.gameplayTranslationRequiredIds.length > 0
            ? "PROCEDURE_BLOCKED"
            : "COMPLETE",
    },
  ));

  checkpoint.push(receipt(
    "D4",
    "PROVE",
    "Root-Cause Consolidation",
    defectResolution.status === "BLOCKED"
      ? "PARTIAL"
      : "CLOSED",
    "Resolved defects are ready for semantic root-cause consolidation; report coverage enforces one-time causal-link coverage.",
    defectResolution.confirmedDefectReadyIds,
    ["RootCauseConsolidation"],
  ));

  checkpoint.push(receipt(
    "E1",
    "REPORT",
    "Final Bug Contract",
    defectResolution.status === "BLOCKED"
      ? "OPEN"
      : "CLOSED",
    defectResolution.status === "BLOCKED"
      ? "Defect Resolution still blocks Proposed Bug Set admission."
      : "Report admission may proceed for confirmed defects only.",
    defectResolution.confirmedDefectReadyIds,
    ["ProposedBugSet"],
  ));

  const blocks = (
    ["UNDERSTAND", "MODEL", "STRESS", "PROVE", "REPORT"] as const
  ).map((block) => blockClosure(block, checkpoint));

  const status =
    blocks.some((item) => item.status === "OPEN")
      ? "OPEN"
      : blocks.some((item) => item.status === "PARTIAL")
        ? "PARTIAL"
        : "CLOSED";

  const reasons = blocks.flatMap((block) =>
    block.status === "CLOSED"
      ? []
      : [
          block.block +
            " is " +
            block.status +
            (block.openCheckpointIds.length > 0
              ? "; open: " + block.openCheckpointIds.join(", ")
              : "") +
            (block.partialCheckpointIds.length > 0
              ? "; partial: " + block.partialCheckpointIds.join(", ")
              : "") +
            ".",
        ],
  );

  const blockingCheckpointIds = checkpoint
    .filter((item) => item.blocksPublication)
    .map((item) => item.id)
    .sort();

  return {
    schemaVersion: 1,
    policy: "mandatory-gameplay-audit-procedure",
    checkpoints: checkpoint,
    blocks,
    status,
    stateRegistry,
    ownershipRegistry,
    progressionContracts,
    blockingCheckpointIds,
    reasons,
  };
}
