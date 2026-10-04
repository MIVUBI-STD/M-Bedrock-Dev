import type { SemanticIr } from "../../../semantic-ir/src/index.js";
import type { GameplayIntentModel } from "../../../gameplay-intent/src/index.js";
import type { GameplayWorldModel } from "./gameplay-world-model.js";
import type { GameplayDiscoveryClosure } from "./gameplay-discovery-closure.js";
import type { GameplayBoundaryRegistry } from "./gameplay-boundary-registry.js";
import type { MultiplayerStateValidationPlan } from "./multiplayer-state-validation.js";
import type { HiddenGameplayDefectAnalysis } from "./hidden-gameplay-defect-analysis.js";
import {
  deriveMandatoryOwnershipRegistry,
  deriveMandatoryProgressionContracts,
  deriveMandatoryStateRegistry,
  mandatoryAuditBlockClosure as blockClosure,
  mandatoryAuditObligation as obligation,
  mandatoryAuditReceipt as receipt,
  positiveNotApplicable,
} from "./mandatory-audit-support.js";
export type {
  MandatoryAuditBlock,
  MandatoryAuditBlockClosure,
  MandatoryAuditCheckpointReasonCode,
  MandatoryAuditCheckpointReceipt,
  MandatoryAuditCheckpointStatus,
  MandatoryAuditObligation,
  MandatoryAuditOwnershipRecord,
  MandatoryAuditProcedureReceipt,
  MandatoryAuditProgressionRecord,
  MandatoryAuditStateRecord,
} from "./mandatory-audit-support.js";
import type {
  MandatoryAuditCheckpointReceipt,
  MandatoryAuditProcedureReceipt,
} from "./mandatory-audit-support.js";

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
  const stateRegistry = deriveMandatoryStateRegistry(
    semanticIr,
    world.persistence?.propertiesDetail ?? [],
  );
  const ownershipRegistry = deriveMandatoryOwnershipRegistry(semanticIr);
  const progressionContracts = deriveMandatoryProgressionContracts(intent);
  const demanded = new Set(world.analysisDemand ?? []);
  const deferredRelations = semanticIr.temporal.relations.filter(
    (relation) =>
      relation.kind === "deferred" ||
      relation.kind === "periodic",
  );
  const writableStates = stateRegistry.filter(
    (item) => item.writeRegions.length > 0,
  );
  const unboundedWritableStates = writableStates.filter(
    (item) =>
      item.clearRegions.length === 0 &&
      item.authorityContractIds.length === 0 &&
      item.staleRisk !== "bounded",
  );
  const explicitOwnership = ownershipRegistry.filter(
    (item) =>
      item.authorityStatus === "explicit-contract",
  );
  const unresolvedOwnership = ownershipRegistry.filter(
    (item) =>
      item.authorityStatus ===
      "multi-writer-unresolved",
  );
  const capabilityDeliveryFailures =
    hidden.capabilityDelivery.filter(
      (item) =>
        item.status === "DEGRADED" ||
        item.status === "MISSING",
    );
  const capabilityDeliveryUnproven =
    hidden.capabilityDelivery.filter(
      (item) => item.status === "UNPROVEN",
    );
  const capabilityFailureRoutedIds =
    capabilityDeliveryFailures
      .filter((failure) =>
        graph.causalLinks.some((link) =>
          link.status === "CONTRADICTED" &&
          (
            link.subjectIds.includes(
              failure.subjectId,
            ) ||
            link.componentIds.includes(
              failure.subjectId,
            ) ||
            (
              failure.subjectId ===
                "runtime:arena-capacity" &&
              graph.scenarios.some(
                (scenario) =>
                  scenario.id ===
                    link.scenarioId &&
                  scenario.label ===
                    "arena-capacity-plus-one",
              )
            )
          )
        )
      )
      .map((item) => item.subjectId)
      .sort();
  const progressionIncomplete = progressionContracts.filter(
    (item) =>
      item.kind === "objective"
        ? item.inboundEdgeIds.length === 0 ||
          (
            item.effectEdgeIds.length === 0 &&
            item.transitionEdgeIds.length === 0 &&
            item.terminalEdgeIds.length === 0
          )
        : item.kind === "outcome"
          ? item.inboundEdgeIds.length === 0 &&
            item.terminalEdgeIds.length === 0
          : item.inboundEdgeIds.length === 0 &&
            item.transitionEdgeIds.length === 0 &&
            item.outboundEdgeIds.length === 0,
  );
  const checkpoint: MandatoryAuditCheckpointReceipt[] = [];

  checkpoint.push(receipt(
    "A1",
    "TARGET",
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
    "DISCOVERY",
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
      : unboundedWritableStates.length > 0
        ? "PARTIAL"
        : "CLOSED",
    stateRegistry.length === 0
      ? discovery.status === "COMPLETE"
        ? "No material Semantic IR state surfaces were discovered after complete discovery."
        : "State applicability cannot be closed while discovery is incomplete."
      : unboundedWritableStates.length > 0
        ? "Writable state remains without clear/reset or explicit authority evidence."
        : "Material state surfaces have bounded write/clear or authority evidence.",
    semanticIr.state.operations.map((item) => item.id),
    ["StateRegistry"],
    {
      obligations: [
        obligation(
          "state-writes-bounded",
          writableStates.length > 0,
          unboundedWritableStates.length === 0,
          "Every writable material state must have clear/reset or explicit authority evidence.",
          writableStates.map((item) => item.surfaceId),
        ),
      ],
    },
  ));

  const ownershipApplicable =
    ownershipRegistry.length > 0 ||
    world.arenas.detected ||
    deferredRelations.length > 0;
  checkpoint.push(receipt(
    "A5",
    "UNDERSTAND",
    "Ownership Registry",
    !ownershipApplicable
      ? discovery.status === "COMPLETE"
        ? "NOT_APPLICABLE"
        : "OPEN"
      : unresolvedOwnership.length > 0
        ? "PARTIAL"
        : "CLOSED",
    !ownershipApplicable
      ? discovery.status === "COMPLETE"
        ? "No shared/session/deferred ownership surface remains after complete discovery."
        : "Ownership applicability cannot close while discovery is incomplete."
      : "Ownership obligations are evaluated from authority bindings, arena lifecycle/isolation, and deferred ownership.",
    ownershipRegistry.flatMap((item) => [
      ...(item.authorityContractId === undefined
        ? []
        : [item.authorityContractId]),
      ...item.observedWriterRegionIds,
    ]),
    ["OwnershipRegistry"],
    {
      obligations: [
        obligation(
          "state-authority-accounted",
          explicitOwnership.length > 0,
          explicitOwnership.every(
            (item) =>
              (item.authoritySurfaceId?.trim().length ?? 0) > 0,
          ),
          "Explicit state authority bindings must identify a concrete authority surface.",
          explicitOwnership.flatMap((item) =>
            item.authorityContractId === undefined
              ? []
              : [item.authorityContractId]
          ),
        ),
        obligation(
          "arena-ownership-accounted",
          world.arenas.detected,
          !world.arenas.detected ||
            (
              world.analysisExecution.executedCapabilityIds.includes(
                "arena-lifecycle-integrity",
              ) &&
              world.arenas.lifecycle.unresolved === 0 &&
              world.arenas.isolation.unknown === 0
            ),
          "Detected arenas require lifecycle and isolation ownership to resolve.",
          ["analysis:arena-lifecycle", "analysis:multiplayer-interleaving"],
        ),
        obligation(
          "state-multi-writer-authority-resolved",
          ownershipRegistry.some(
            (item) =>
              item.observedWriterRegionIds.length > 1,
          ),
          unresolvedOwnership.length === 0,
          "State surfaces with multiple writer regions require explicit authority binding or remain unresolved.",
          unresolvedOwnership.flatMap(
            (item) => item.observedWriterRegionIds,
          ),
        ),
        obligation(
          "deferred-ownership-accounted",
          deferredRelations.length > 0,
          deferredRelations.length === 0 ||
            world.analysisExecution.executedCapabilityIds.includes(
              "temporal-ownership-integrity",
            ),
          "Deferred/periodic work requires temporal ownership analysis.",
          deferredRelations.map((item) => item.id),
        ),
      ],
    },
  ));

  checkpoint.push(receipt(
    "A6",
    "UNDERSTAND",
    "Progression Contract",
    progressionContracts.length === 0
      ? discovery.status === "COMPLETE"
        ? "NOT_APPLICABLE"
        : "OPEN"
      : progressionIncomplete.length === 0
        ? "CLOSED"
        : "PARTIAL",
    progressionContracts.length === 0
      ? discovery.status === "COMPLETE"
        ? "No objective/phase/outcome progression surface remains after complete discovery."
        : "Progression applicability cannot close while discovery is incomplete."
      : "Objective/phase/outcome progression edges are projected from gameplay intent.",
    progressionContracts.flatMap((item) => [
      ...item.inboundEdgeIds,
      ...item.outboundEdgeIds,
      ...item.dependencyEdgeIds,
      ...item.stateResourceSubjectIds,
    ]),
    ["ProgressionContracts"],
    {
      obligations: [
        obligation(
          "progression-chain-connected",
          progressionContracts.length > 0,
          progressionIncomplete.length === 0,
          "Objectives require inbound and outbound progression links; outcomes require inbound proof; phases require at least one transition connection.",
          progressionContracts.flatMap((item) => [
            ...item.inboundEdgeIds,
            ...item.outboundEdgeIds,
          ]),
        ),
      ],
    },
  ));

  checkpoint.push(receipt(
    "A7",
    "UNDERSTAND",
    "Gameplay Model Closure",
    world.gameplayClosure.status,
    world.gameplayClosure.status === "CLOSED"
      ? "Gameplay model closure is CLOSED."
      : "Gameplay model closure remains " +
        world.gameplayClosure.status +
        "; unresolved material semantics cannot be bypassed.",
    world.gameplayClosure.surfaces.flatMap(
      (surface) => surface.evidenceIds,
    ),
    ["GameplayModelClosure"],
    {
      obligations: [
        obligation(
          "gameplay-model-state-complete",
          true,
          world.gameplayClosure.stateModelComplete,
          "Gameplay model closure requires a complete material state model.",
          world.gameplayClosure.surfaces.flatMap(
            (surface) => surface.evidenceIds,
          ),
        ),
        obligation(
          "gameplay-model-boundaries-extracted",
          true,
          world.gameplayClosure.boundariesExtracted,
          "Gameplay model closure requires material boundaries to be extracted.",
          world.gameplayClosure.surfaces.flatMap(
            (surface) => surface.boundaries,
          ),
        ),
        obligation(
          "gameplay-model-surfaces-accounted",
          true,
          world.gameplayClosure.unaccountedSurfaceIds.length === 0,
          "Gameplay model closure requires every discovered material surface to be accounted.",
          world.gameplayClosure.unaccountedSurfaceIds,
        ),
      ],
    },
  ));

  checkpoint.push(receipt(
    "B1",
    "MODEL",
    "Actor / Entity Contract",
    world.entities.definitions === 0
      ? positiveNotApplicable(
          discovery,
          demanded.has("entity-behavior"),
          world.entities.definitions > 0,
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
      ? discovery.status === "COMPLETE"
        ? "NOT_APPLICABLE"
        : "OPEN"
      : world.chunks.cleanupOrderUnproven > 0 ||
          world.chunks.readinessUnverifiedLeases > 0
        ? "PARTIAL"
        : "CLOSED",
    !spatialApplicable
      ? discovery.status === "COMPLETE"
        ? "No material spatial/simulation dependency remains after complete discovery."
        : "Spatial/simulation applicability cannot close while discovery is incomplete."
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
  const replicaProofIncomplete =
    world.arenas.replicaIntegrity.incomplete > 0 ||
    world.arenas.replicaIntegrity.noProof > 0 ||
    world.arenas.replicaIntegrity.bounded > 0;
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
          world.arenas.isolation.unknown > 0 ||
          replicaProofIncomplete
        ? "PARTIAL"
        : "CLOSED",
    !multiArena
      ? discovery.status === "COMPLETE"
        ? "Complete discovery supports a single/no-arena model."
        : "Multi-arena applicability cannot close while discovery is incomplete or arena count is unresolved."
      : replicaProofIncomplete
        ? "Multi-arena world/topology replica proof is incomplete or unavailable. MODEL cannot inherit baseline behavior into unproven replicas."
        : world.arenas.count !== undefined &&
            world.arenas.safeConcurrentArenas !== undefined &&
            world.arenas.safeConcurrentArenas !== null &&
            world.arenas.safeConcurrentArenas < world.arenas.count
          ? "Multi-arena model is understood, but player-visible arena capacity exceeds playable concurrent capacity. This mismatch is routed to PROVE as a gameplay/design contradiction; queue/fallback/platform limits do not erase it."
          : "Arena baseline, replica integrity, capacity, lifecycle, and isolation obligations are accounted.",
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
        obligation(
          "arena-world-db-replica-proof",
          multiArena,
          !replicaProofIncomplete &&
            (
              world.arenas.replicaIntegrity.complete > 0 ||
              world.arenas.replicaIntegrity.bounded > 0 ||
              world.arenas.replicaIntegrity.diverged > 0
            ),
          "Multi-arena full-map audit requires normalized world/topology replica proof. Divergence may continue to PROVE, but incomplete/no-proof replicas cannot close MODEL.",
          ["analysis:arena-replica-integrity"],
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
      ? discovery.status === "COMPLETE"
        ? "NOT_APPLICABLE"
        : "OPEN"
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

  checkpoint.push(receipt(
    "B6",
    "MODEL",
    "Gameplay Capability Delivery",
    capabilityDeliveryUnproven.length > 0
      ? "PARTIAL"
      : "CLOSED",
    capabilityDeliveryUnproven.length > 0
      ? "Some player-visible/design capability delivery remains unproven: " +
        capabilityDeliveryUnproven
          .map((item) => item.subjectId)
          .join(", ") +
        "."
      : capabilityDeliveryFailures.length > 0
        ? "Capability delivery failures are understood and must continue to PROVE; technical constraints explain root cause but do not erase player-visible design failure."
        : "Known player-visible gameplay capabilities are delivered by the selected artifact.",
    hidden.capabilityDelivery.flatMap(
      (item) => item.evidenceIds,
    ),
    ["GameplayCapabilityDelivery"],
    {
      obligations: [
        obligation(
          "capability-delivery-classified",
          hidden.capabilityDelivery.length > 0,
          capabilityDeliveryUnproven.length === 0,
          "Every grounded player-visible gameplay capability must be classified as delivered, degraded, or missing before proof.",
          hidden.capabilityDelivery.flatMap(
            (item) => item.evidenceIds,
          ),
        ),
      ],
    },
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
          demanded.has("combat-lifecycle"),
          combatApplicable,
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
          demanded.has("inventory-state"),
          inventoryApplicable,
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
          demanded.has("economy-reward"),
          economyApplicable,
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
      : discovery.status === "COMPLETE" &&
          !demanded.has("persistence-recovery")
        ? "NOT_APPLICABLE"
        : "OPEN",
    persistenceApplicable
      ? "Persistence scope/lifetime evidence is projected across lifecycle boundaries."
      : discovery.status === "COMPLETE"
        ? "No persistent gameplay state remains after complete discovery."
        : "Persistence applicability cannot close while discovery is incomplete.",
    ["analysis:persistence-recovery"],
    ["PersistenceMatrix"],
  ));

  checkpoint.push(receipt(
    "C5",
    "STRESS",
    "Deferred Work Registry",
    deferredRelations.length > 0
      ? "CLOSED"
      : discovery.status === "COMPLETE" &&
          !demanded.has("temporal-ownership")
        ? "NOT_APPLICABLE"
        : "OPEN",
    deferredRelations.length > 0
      ? "Deferred/periodic work is enumerated with guard evidence; unsafe work flows into contradiction analysis."
      : discovery.status === "COMPLETE"
        ? "No deferred/periodic gameplay work remains after complete discovery."
        : "Deferred-work applicability cannot close while discovery is incomplete.",
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
  const competingTerminalIntent =
    intent.nodes.filter((node) => node.kind === "outcome").length > 1;
  checkpoint.push(receipt(
    "C6",
    "STRESS",
    "Terminal Ownership",
    terminalScenario
      ? "CLOSED"
      : discovery.status === "COMPLETE" &&
          !competingTerminalIntent
        ? "NOT_APPLICABLE"
        : "OPEN",
    terminalScenario
      ? "Terminal collision scenario is compiled and routed through causal analysis."
      : discovery.status === "COMPLETE"
        ? "No materially competing terminal scenario was activated after complete discovery."
        : "Terminal-collision applicability cannot close while discovery is incomplete.",
    terminalScenario ? [terminalScenario.id] : [],
    ["TerminalCollisionMatrix"],
  ));

  const cleanupApplicable =
    world.arenas.cleanup.acquiredSurfaces > 0 ||
    world.arenas.cleanup.resourceLedger.resources > 0;
  const cleanupDemand =
    cleanupApplicable ||
    world.arenas.detected ||
    deferredRelations.length > 0 ||
    inventoryApplicable ||
    world.entities.definitions > 0 ||
    world.structures.loads > 0 ||
    world.chunks.tickingAreaAcquires > 0;
  checkpoint.push(receipt(
    "C7",
    "STRESS",
    "Cleanup Ledger",
    !cleanupApplicable
      ? discovery.status === "COMPLETE" && !cleanupDemand
        ? "NOT_APPLICABLE"
        : "OPEN"
      : world.arenas.cleanup.resourceLedger.missing > 0 ||
          world.arenas.cleanup.unresolved > 0
        ? "PARTIAL"
        : "CLOSED",
    cleanupApplicable
      ? "Cleanup resources and terminal coverage are accounted."
      : discovery.status === "COMPLETE" && !cleanupDemand
        ? "No material mutable resource requiring cleanup remains after complete discovery."
        : "Cleanup obligations are expected from detected mutable gameplay resources but no complete cleanup ledger is available.",
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
  const reuseDemand =
    world.arenas.detected ||
    intent.edges.some(
      (edge) =>
        edge.kind === "resets" ||
        edge.kind === "recovers-to",
    );
  checkpoint.push(receipt(
    "C8",
    "STRESS",
    "Second-Run Equivalence",
    repeated
      ? "CLOSED"
      : discovery.status === "COMPLETE" && !reuseDemand
        ? "NOT_APPLICABLE"
        : "OPEN",
    repeated
      ? "Repeated-run scenario is compiled and checked through shared lifecycle dependencies."
      : discovery.status === "COMPLETE" && !reuseDemand
        ? "No replay/reuse/reset/recovery surface is present after complete discovery."
        : "Replay/reuse applicability is unresolved; detected reset/recovery or arena lifecycle requires explicit repeated-run accounting.",
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

  const requiredCrossSystemScenarioLabels =
    new Set<string>();

  const hasArena =
    demanded.has("arena-lifecycle") ||
    world.arenas.detected;
  const hasMultiplayer =
    demanded.has("multiplayer-interleaving") ||
    multiplayer.applicable;
  const hasCombat =
    demanded.has("combat-lifecycle");
  const hasInventory =
    demanded.has("inventory-state");
  const hasPersistence =
    demanded.has("persistence-recovery") ||
    (world.persistence?.properties ?? 0) > 0;
  const hasEconomy =
    demanded.has("economy-reward");
  const hasTemporal =
    demanded.has("temporal-ownership") ||
    deferredRelations.length > 0;
  const hasMutableRunState =
    hasArena ||
    hasInventory ||
    hasPersistence ||
    hasEconomy ||
    world.entities.definitions > 0 ||
    world.structures.loads > 0 ||
    world.chunks.tickingAreaAcquires > 0;

  if (hasArena && hasMultiplayer) {
    requiredCrossSystemScenarioLabels.add(
      "multi-arena-parallel",
    );
  }
  if (multiArena) {
    requiredCrossSystemScenarioLabels.add(
      "arena-replica-integrity",
    );
  }
  if (
    hasPersistence &&
    (
      hasInventory ||
      hasCombat ||
      hasArena
    )
  ) {
    requiredCrossSystemScenarioLabels.add(
      "disconnect-reconnect",
    );
    requiredCrossSystemScenarioLabels.add(
      "reload-recovery",
    );
  }
  if (hasTemporal) {
    requiredCrossSystemScenarioLabels.add(
      "deferred-ownership",
    );
  }
  if (
    hasCombat &&
    (
      hasEconomy ||
      hasArena ||
      hasTemporal
    )
  ) {
    requiredCrossSystemScenarioLabels.add(
      "terminal-collision",
    );
  }
  if (hasMutableRunState) {
    requiredCrossSystemScenarioLabels.add(
      "repeated-run",
    );
  }
  if (
    world.arenas.count !== undefined &&
    world.arenas.safeConcurrentArenas !== undefined &&
    world.arenas.safeConcurrentArenas !== null &&
    world.arenas.safeConcurrentArenas <
      world.arenas.count
  ) {
    requiredCrossSystemScenarioLabels.add(
      "arena-capacity-plus-one",
    );
  }

  const crossSystemScenarios = graph.scenarios.filter(
    (scenario) =>
      requiredCrossSystemScenarioLabels.has(
        scenario.label,
      ),
  );
  const activatedCrossSystemLabels =
    new Set(
      crossSystemScenarios.map(
        (scenario) => scenario.label,
      ),
    );
  const missingCrossSystemLabels = [
    ...requiredCrossSystemScenarioLabels,
  ]
    .filter(
      (label) =>
        !activatedCrossSystemLabels.has(label),
    )
    .sort();

  checkpoint.push(receipt(
    "C9",
    "STRESS",
    "Cross-System Activation",
    missingCrossSystemLabels.length === 0
      ? requiredCrossSystemScenarioLabels.size > 0
        ? "CLOSED"
        : discovery.status === "COMPLETE"
          ? "NOT_APPLICABLE"
          : "OPEN"
      : "OPEN",
    missingCrossSystemLabels.length > 0
      ? "Required cross-system scenario families are missing: " +
        missingCrossSystemLabels.join(", ") +
        "."
      : requiredCrossSystemScenarioLabels.size > 0
        ? "Every high-value cross-system scenario family demanded by the selected artifact is activated."
        : discovery.status === "COMPLETE"
          ? "No high-value cross-system intersection is demanded after complete discovery."
          : "Cross-system applicability cannot close while discovery is incomplete.",
    crossSystemScenarios.map((item) => item.id),
    ["ActivatedCrossSystemScenarioSet"],
    {
      obligations: [
        obligation(
          "required-cross-system-scenarios-activated",
          requiredCrossSystemScenarioLabels.size > 0,
          missingCrossSystemLabels.length === 0,
          "Every materially demanded cross-system intersection must activate its scenario family; one unrelated cross-system scenario cannot satisfy the whole checkpoint.",
          crossSystemScenarios.map(
            (item) => item.id,
          ),
        ),
      ],
    },
  ));

  checkpoint.push(receipt(
    "D1",
    "PROVE",
    "Required Inspection Graph",
    scenarioClosure.missingRequiredKnowledgeIds.length > 0 ||
      scenarioClosure.capabilityGapKnowledgeIds.length > 0 ||
      scenarioClosure.prerequisiteBlockedKnowledgeIds.length > 0 ||
      capabilityFailureRoutedIds.length !==
        capabilityDeliveryFailures.length
      ? "OPEN"
      : "CLOSED",
    capabilityFailureRoutedIds.length !==
        capabilityDeliveryFailures.length
      ? "A gameplay capability delivery failure exists without a CONTRADICTED causal link; design/implementation failure has not been routed into proof."
      : "RIG knowledge receipts and gameplay capability delivery failures are evaluated fail-closed.",
    [
      ...graph.knowledgeReceipts.flatMap(
        (item) => item.evidenceIds,
      ),
      ...hidden.capabilityDelivery.flatMap(
        (item) => item.evidenceIds,
      ),
    ],
    ["RequiredInspectionGraph", "GameplayCapabilityDelivery"],
    {
      obligations: [
        obligation(
          "capability-failures-routed-to-proof",
          capabilityDeliveryFailures.length > 0,
          capabilityFailureRoutedIds.length ===
            capabilityDeliveryFailures.length,
          "Every degraded/missing player-visible capability must map to a CONTRADICTED causal link; technical explanation alone cannot close it.",
          capabilityFailureRoutedIds,
        ),
        obligation(
          "runtime-residue-has-targeted-tests",
          scenarioClosure.runtimeBlockedCausalLinkIds.length > 0,
          scenarioClosure.runtimeProofRequests.length ===
            scenarioClosure.runtimeBlockedCausalLinkIds.length,
          "Every runtime-blocked gameplay dependency must emit one narrow runtime proof request; unresolved runtime residue may never remain a status-only note.",
          scenarioClosure.runtimeProofRequests.map(
            (item) => item.causalLinkId,
          ),
        ),
        obligation(
          "detection-gaps-have-targeted-tests",
          scenarioClosure.detectionGapCausalLinkIds.length > 0,
          scenarioClosure.detectionGapTestRequests.length ===
            scenarioClosure.detectionGapCausalLinkIds.length,
          "Every detection gap must emit one targeted tester obligation so unsupported semantics cannot silently remove a required gameplay test.",
          scenarioClosure.detectionGapTestRequests.map(
            (item) => item.causalLinkId,
          ),
        ),
      ],
    },
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
    {
      reasonCode:
        scenarioClosure.status === "PARTIAL"
          ? "RUNTIME_PROOF_REQUIRED"
          : scenarioClosure.status === "OPEN"
            ? "PROCEDURE_BLOCKED"
            : "COMPLETE",
    },
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
    "Map Audit Report Contract",
    defectResolution.status === "BLOCKED"
      ? "OPEN"
      : "CLOSED",
    defectResolution.status === "BLOCKED"
      ? "Source-side defect resolution work still blocks report readiness."
      : "Map Audit Report may preserve every material PROVEN and NEED_VALIDATION finding; approved Bug Report V2 promotion remains downstream.",
    [
      ...defectResolution.confirmedDefectReadyIds,
      ...defectResolution.runtimeProofRequiredIds,
      ...defectResolution.detectionGapIds,
    ],
    ["MapAuditReport"],
  ));

  const blocks = (
    ["TARGET", "DISCOVERY", "UNDERSTAND", "MODEL", "STRESS", "PROVE", "REPORT"] as const
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
