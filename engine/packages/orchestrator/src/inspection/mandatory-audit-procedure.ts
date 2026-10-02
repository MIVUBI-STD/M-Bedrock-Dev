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

export interface MandatoryAuditCheckpointReceipt {
  readonly id: string;
  readonly block: MandatoryAuditBlock;
  readonly label: string;
  readonly status: MandatoryAuditCheckpointStatus;
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
): MandatoryAuditCheckpointReceipt {
  return {
    id,
    block,
    label,
    status,
    reason,
    evidenceIds: [...new Set(evidenceIds)].sort(),
    outputIds: [...new Set(outputIds)].sort(),
  };
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
    fullJourney && fullJourney.composedScenarioIds.length > 0
      ? "CLOSED"
      : "OPEN",
    fullJourney && fullJourney.composedScenarioIds.length > 0
      ? "Full journey is represented as a composition of concrete gameplay scenarios."
      : "No complete full-journey composition is available.",
    fullJourney?.composedScenarioIds ?? [],
    ["PlayerJourneyGraph"],
  ));

  checkpoint.push(receipt(
    "A4",
    "UNDERSTAND",
    "State Registry",
    stateRegistry.length === 0 ? "NOT_APPLICABLE" : "CLOSED",
    stateRegistry.length === 0
      ? "No material Semantic IR state surfaces were discovered."
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
      ? "NOT_APPLICABLE"
      : world.entities.staticAnalysisLimits > 0 ||
          world.entities.navigationEnvironment.unresolved > 0
        ? "PARTIAL"
        : "CLOSED",
    world.entities.definitions === 0
      ? "No gameplay entity definitions were discovered."
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
    ["analysis:spatial-authority", "analysis:chunk-simulation"],
    ["SpatialSimulationContract"],
  ));

  checkpoint.push(receipt(
    "B3",
    "MODEL",
    "Multiplayer Contract",
    !multiplayer.applicable
      ? "NOT_APPLICABLE"
      : multiplayer.scenarios.length > 0
        ? "CLOSED"
        : "PARTIAL",
    !multiplayer.applicable
      ? "No multiplayer/shared-player surface was detected."
      : "Applicable mixed-player scenarios are compiled.",
    multiplayer.scenarios.map((item) => item.id),
    ["MultiplayerContract"],
  ));

  const multiArena =
    world.arenas.detected && (world.arenas.count ?? 0) > 1;
  checkpoint.push(receipt(
    "B4",
    "MODEL",
    "Multi-Arena Contract",
    !multiArena
      ? "NOT_APPLICABLE"
      : world.arenas.safeConcurrentArenas == null ||
          world.arenas.isolation.unknown > 0
        ? "PARTIAL"
        : "CLOSED",
    !multiArena
      ? "Multiple arenas were not discovered."
      : "Arena capacity and isolation evidence is accounted.",
    ["analysis:arena-lifecycle", "analysis:multiplayer-interleaving"],
    ["MultiArenaContract"],
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
    combatApplicable ? "CLOSED" : "NOT_APPLICABLE",
    combatApplicable
      ? "Combat lifecycle paths are analyzed; contradictions flow into PROVE."
      : "No combat lifecycle surface was discovered.",
    ["analysis:combat-lifecycle"],
    ["CombatLifecycleContract"],
  ));

  const inventoryApplicable =
    world.inventory.regions > 0 ||
    world.inventory.grantRegions > 0 ||
    world.inventory.dropRegions > 0;
  checkpoint.push(receipt(
    "C2",
    "STRESS",
    "Inventory Lifecycle",
    inventoryApplicable ? "CLOSED" : "NOT_APPLICABLE",
    inventoryApplicable
      ? "Inventory lifecycle and restore ownership are analyzed."
      : "No inventory lifecycle surface was discovered.",
    ["analysis:inventory-state"],
    ["InventoryLifecycleContract"],
  ));

  const economyApplicable = world.economy.sourceKinds.length > 0;
  checkpoint.push(receipt(
    "C3",
    "STRESS",
    "Reward / Economy Contract",
    economyApplicable ? "CLOSED" : "NOT_APPLICABLE",
    economyApplicable
      ? "Reward source, delivery, consume, and idempotency paths are analyzed."
      : "No reward/economy surface was discovered.",
    ["analysis:economy-reward"],
    ["RewardEconomyContract"],
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

  return {
    schemaVersion: 1,
    policy: "mandatory-gameplay-audit-procedure",
    checkpoints: checkpoint,
    blocks,
    status,
    stateRegistry,
    ownershipRegistry,
    progressionContracts,
    reasons,
  };
}
