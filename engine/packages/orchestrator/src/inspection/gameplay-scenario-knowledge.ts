import {
  BUILTIN_ANALYSIS_CAPABILITIES,
  createAnalysisCapabilityRegistry,
  type AnalysisExecutionContext,
} from "../../../analysis-planner/src/index.js";
import type {
  GameplayIntentEdge,
  GameplayIntentEdgeKind,
  GameplayIntentModel,
  GameplayIntentNode,
} from "../../../gameplay-intent/src/index.js";
import type {
  GameplayAuditScenarioKind,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  GameplayWorldModel,
} from "./gameplay-world-model.js";
import type {
  GameplayKnowledgeDomain,
  GameplayKnowledgeReceipt,
  GameplayKnowledgeRequirement,
} from "./gameplay-scenario-model.js";

const registry = createAnalysisCapabilityRegistry(
  BUILTIN_ANALYSIS_CAPABILITIES,
);

const DOMAIN_DEPENDENCIES: Readonly<Partial<Record<
  GameplayKnowledgeDomain,
  readonly GameplayKnowledgeDomain[]
>>> = {
  "arena-lifecycle": ["state-flow"],
  "multiplayer-interleaving": [
    "state-flow",
    "arena-lifecycle",
  ],
  "chunk-simulation": ["state-flow", "platform-constraints"],
  "entity-behavior": [
    "state-flow",
    "chunk-simulation",
  ],
  "combat-lifecycle": [
    "state-flow",
    "entity-behavior",
  ],
  "inventory-state": ["state-flow"],
  "persistence-recovery": ["state-flow"],
  "world-structure": ["state-flow"],
  "economy-reward": [
    "state-flow",
    "inventory-state",
  ],
  "spatial-authority": ["state-flow"],
  "temporal-ownership": ["state-flow"],
  "platform-constraints": ["state-flow"],
};

function capabilityIdsForDomain(
  domain: GameplayKnowledgeDomain,
  context: AnalysisExecutionContext,
): readonly string[] {
  return registry.capabilities
    .filter((capability) =>
      capability.contexts.includes(context) &&
      capability.evidenceLevel !== "runtime" &&
      capability.evidenceLevel !== "intervention" &&
      (capability.knowledgeDomains ?? [])
        .includes(domain)
    )
    .map((capability) => capability.id)
    .sort();
}

function executedCapabilityIdsForDomain(
  world: GameplayWorldModel,
  domain: GameplayKnowledgeDomain,
): readonly string[] {
  const executed = new Set(
    world.analysisExecution.executedCapabilityIds,
  );
  return registry.capabilities
    .filter((capability) =>
      (capability.knowledgeDomains ?? [])
        .includes(domain) &&
      executed.has(capability.id)
    )
    .map((capability) => capability.id)
    .sort();
}

function domainExecuted(
  world: GameplayWorldModel,
  domain: GameplayKnowledgeDomain,
): boolean {
  return executedCapabilityIdsForDomain(
    world,
    domain,
  ).length > 0;
}

function domainEvidence(
  world: GameplayWorldModel,
  domain: GameplayKnowledgeDomain,
): readonly string[] {
  if (!domainExecuted(world, domain)) return [];
  switch (domain) {
    case "state-flow":
      return ["analysis:state-flow"];
    case "arena-lifecycle":
      return ["analysis:arena-lifecycle"];
    case "multiplayer-interleaving":
      return ["analysis:multiplayer-interleaving"];
    case "chunk-simulation":
      return ["analysis:chunk-simulation"];
    case "entity-behavior":
      return ["analysis:entity-behavior"];
    case "combat-lifecycle":
      return ["analysis:combat-lifecycle"];
    case "inventory-state":
      return ["analysis:inventory-state"];
    case "persistence-recovery":
      return ["analysis:persistence-recovery"];
    case "world-structure":
      return ["analysis:world-structure"];
    case "economy-reward":
      return ["analysis:economy-reward"];
    case "spatial-authority":
      return ["analysis:spatial-authority"];
    case "temporal-ownership":
      return ["analysis:temporal-ownership"];
    case "platform-constraints":
      return ["analysis:platform-constraints"];
  }
}

function add(
  domains: Set<GameplayKnowledgeDomain>,
  domain: GameplayKnowledgeDomain,
): void {
  domains.add(domain);
}

const SCENARIO_TRAVERSAL_EDGE_KINDS =
  new Set<GameplayIntentEdgeKind>([
    "owns",
    "participates-in",
    "produces",
    "consumes",
    "transitions-to",
    "valid-during",
    "scoped-to",
    "located-in",
    "resets",
    "persists",
    "requires",
    "recovers-to",
    "wins-by",
    "loses-by",
  ]);

export function gameplayScenarioNeighborhoodNodeIds(
  model: GameplayIntentModel,
  anchorId: string,
  maxDepth = 3,
): readonly string[] {
  const visited = new Set<string>([anchorId]);
  let frontier = [anchorId];

  for (
    let depth = 0;
    depth < maxDepth && frontier.length > 0;
    depth += 1
  ) {
    const next = new Set<string>();
    for (const current of frontier) {
      for (const edge of model.edges) {
        if (
          edge.status === "hypothesis" ||
          !SCENARIO_TRAVERSAL_EDGE_KINDS.has(edge.kind)
        ) {
          continue;
        }
        if (edge.from === current && !visited.has(edge.to)) {
          visited.add(edge.to);
          next.add(edge.to);
        }
        if (edge.to === current && !visited.has(edge.from)) {
          visited.add(edge.from);
          next.add(edge.from);
        }
      }
    }
    frontier = [...next];
  }

  return [...visited].sort();
}

function semanticDomains(
  node: GameplayIntentNode,
  model: GameplayIntentModel,
  world: GameplayWorldModel,
): Set<GameplayKnowledgeDomain> {
  const domains = new Set<GameplayKnowledgeDomain>([
    "state-flow",
  ]);

  const relatedIds = new Set(
    gameplayScenarioNeighborhoodNodeIds(
      model,
      node.id,
    ),
  );
  const relatedEdges: GameplayIntentEdge[] =
    model.edges.filter(
      (edge) =>
        edge.status !== "hypothesis" &&
        relatedIds.has(edge.from) &&
        relatedIds.has(edge.to),
    );
  const relatedNodes = model.nodes.filter((item) =>
    relatedIds.has(item.id)
  );

  if (
    relatedNodes.some((item) =>
      item.kind === "actor" || item.kind === "role"
    )
  ) {
    add(domains, "entity-behavior");
  }
  const hasActor = relatedNodes.some(
    (item) =>
      item.kind === "actor" || item.kind === "role",
  );
  const hasSpatialRegion = relatedNodes.some(
    (item) => item.kind === "spatial-region",
  );
  if (hasActor && hasSpatialRegion) {
    add(domains, "chunk-simulation");
  }
  if (
    relatedNodes.some((item) =>
      item.kind === "spatial-region"
    )
  ) {
    add(domains, "spatial-authority");
    add(domains, "world-structure");
  }
  if (
    relatedNodes.some((item) =>
      item.kind === "resource"
    )
  ) {
    if (
      world.inventory.regions > 0 ||
      world.inventory.grantRegions > 0
    ) {
      add(domains, "inventory-state");
    }
    if (world.economy.sourceKinds.length > 0) {
      add(domains, "economy-reward");
    }
  }
  if (
    relatedEdges.some((edge) =>
      edge.kind === "persists" ||
      edge.kind === "recovers-to" ||
      edge.kind === "resets"
    )
  ) {
    if ((world.persistence?.properties ?? 0) > 0) {
      add(domains, "persistence-recovery");
    }
  }
  if (
    relatedEdges.some((edge) =>
      edge.kind === "owns" ||
      edge.kind === "scoped-to"
    ) &&
    world.arenas.detected
  ) {
    add(domains, "arena-lifecycle");
  }
  if (
    node.kind === "lifecycle" &&
    world.arenas.detected
  ) {
    add(domains, "arena-lifecycle");
  }
  if (
    world.combat.hurtHandlers > 0 ||
    world.combat.deathHandlers > 0
  ) {
    if (
      relatedNodes.some((item) =>
        item.kind === "actor" ||
        item.kind === "lifecycle" ||
        item.kind === "outcome"
      )
    ) {
      add(domains, "combat-lifecycle");
    }
  }

  return domains;
}

function applicable(
  world: GameplayWorldModel,
  domain: GameplayKnowledgeDomain,
): boolean {
  switch (domain) {
    case "arena-lifecycle":
    case "multiplayer-interleaving":
      return world.arenas.detected;
    case "chunk-simulation":
      return (
        world.chunks.tickingAreaAcquires > 0 ||
        world.chunks.tickingAreaReadinessStates > 0 ||
        world.chunks.readinessProbes > 0 ||
        world.chunks.entityResidencyObservability !== "absent"
      );
    case "entity-behavior":
      return world.entities.definitions > 0;
    case "combat-lifecycle":
      return (
        world.combat.hurtHandlers > 0 ||
        world.combat.deathHandlers > 0 ||
        world.combat.damageApplications > 0
      );
    case "inventory-state":
      return (
        world.inventory.regions > 0 ||
        world.inventory.grantRegions > 0 ||
        world.inventory.dropRegions > 0
      );
    case "persistence-recovery":
      return (world.persistence?.properties ?? 0) > 0;
    case "world-structure":
      return (
        world.structures.definitions > 0 ||
        world.structures.loads > 0 ||
        world.structures.runtimeLogicLoads > 0
      );
    case "economy-reward":
      return world.economy.sourceKinds.length > 0;
    case "spatial-authority":
      return (
        world.spatial.resolvedScriptEffects > 0 ||
        world.spatial.structurePlacements > 0 ||
        world.spatial.authority.configured
      );
    case "platform-constraints":
      return world.platformKnowledge.profileResolved;
    case "state-flow":
    case "temporal-ownership":
      return true;
  }
}

export function requiredKnowledgeDomainsForPreset(
  kind: GameplayAuditScenarioKind,
  world: GameplayWorldModel,
): readonly GameplayKnowledgeDomain[] {
  const domains = new Set<GameplayKnowledgeDomain>([
    "state-flow",
  ]);
  const addIfApplicable = (
    domain: GameplayKnowledgeDomain,
  ) => {
    if (applicable(world, domain)) add(domains, domain);
  };

  switch (kind) {
    case "full-journey":
      // Full journey is a composition scenario. Its knowledge set is
      // derived by the scenario compiler from the concrete child scenarios.
      break;
    case "solo":
    case "two-player":
    case "max-party":
    case "party-capacity-plus-one":
      addIfApplicable("arena-lifecycle");
      addIfApplicable("multiplayer-interleaving");
      break;
    case "disconnect-reconnect":
      addIfApplicable("arena-lifecycle");
      addIfApplicable("multiplayer-interleaving");
      addIfApplicable("combat-lifecycle");
      addIfApplicable("inventory-state");
      addIfApplicable("persistence-recovery");
      break;
    case "multi-arena-parallel":
    case "arena-capacity-plus-one":
      addIfApplicable("arena-lifecycle");
      addIfApplicable("multiplayer-interleaving");
      add(domains, "platform-constraints");
      addIfApplicable("chunk-simulation");
      break;
    case "reload-recovery":
      addIfApplicable("persistence-recovery");
      addIfApplicable("inventory-state");
      addIfApplicable("entity-behavior");
      addIfApplicable("combat-lifecycle");
      break;
    case "deferred-ownership":
      add(domains, "temporal-ownership");
      addIfApplicable("arena-lifecycle");
      addIfApplicable("persistence-recovery");
      add(domains, "platform-constraints");
      addIfApplicable("chunk-simulation");
      break;
    case "terminal-collision":
      add(domains, "temporal-ownership");
      addIfApplicable("combat-lifecycle");
      addIfApplicable("economy-reward");
      addIfApplicable("arena-lifecycle");
      break;
    case "repeated-run":
      addIfApplicable("arena-lifecycle");
      addIfApplicable("world-structure");
      addIfApplicable("entity-behavior");
      addIfApplicable("inventory-state");
      addIfApplicable("economy-reward");
      addIfApplicable("persistence-recovery");
      break;
  }

  return [...domains].sort();
}

export function requiredKnowledgeDomainsForIntentScenario(
  node: GameplayIntentNode,
  model: GameplayIntentModel,
  world: GameplayWorldModel,
): readonly GameplayKnowledgeDomain[] {
  const domains = semanticDomains(node, model, world);
  if (domains.has("chunk-simulation")) {
    domains.add("platform-constraints");
  }
  return [...domains]
    .filter(
      (domain) =>
        domain === "chunk-simulation" ||
        domain === "platform-constraints" ||
        applicable(world, domain),
    )
    .sort();
}

export function buildGameplayKnowledgeRequirements(
  scenarioId: string,
  domains: readonly GameplayKnowledgeDomain[],
  scope: {
    readonly subjectIds?: readonly string[];
    readonly componentIds?: readonly string[];
  } = {},
  context: AnalysisExecutionContext = "REMOTE_GITHUB",
): readonly GameplayKnowledgeRequirement[] {
  const domainSet = new Set(domains);
  return domains.map((domain) => {
    const capabilityIds = capabilityIdsForDomain(
      domain,
      context,
    );
    const dependsOnRequirementIds =
      (DOMAIN_DEPENDENCIES[domain] ?? [])
        .filter((dependency) =>
          domainSet.has(dependency)
        )
        .map(
          (dependency) =>
            "knowledge:" +
            scenarioId +
            ":" +
            dependency,
        )
        .sort();
    return {
      id: "knowledge:" + scenarioId + ":" + domain,
      scenarioId,
      domain,
      reason:
        "Gameplay scenario requires " +
        domain +
        " evidence to close its causal chain.",
      capabilityIds,
      dependsOnRequirementIds,
      subjectIds: [...(scope.subjectIds ?? [])].sort(),
      componentIds: [...(scope.componentIds ?? [])].sort(),
    };
  });
}

export function buildGameplayKnowledgeReceipts(
  requirements: readonly GameplayKnowledgeRequirement[],
  world: GameplayWorldModel,
): readonly GameplayKnowledgeReceipt[] {
  const byId = new Map(
    requirements.map((requirement) => [
      requirement.id,
      requirement,
    ]),
  );
  const receipts = new Map<
    string,
    GameplayKnowledgeReceipt
  >();
  const visiting = new Set<string>();

  const resolve = (
    requirement: GameplayKnowledgeRequirement,
  ): GameplayKnowledgeReceipt => {
    const existing = receipts.get(requirement.id);
    if (existing) return existing;

    if (visiting.has(requirement.id)) {
      const cycleReceipt: GameplayKnowledgeReceipt = {
        requirementId: requirement.id,
        scenarioId: requirement.scenarioId,
        domain: requirement.domain,
        status: "BLOCKED_BY_PREREQUISITE",
        subjectIds: [...requirement.subjectIds],
        componentIds: [...requirement.componentIds],
        evidenceIds: [],
        capabilityIdsUsed: [],
        reason:
          "Required Inspection Graph contains a prerequisite cycle at " +
          requirement.id +
          ".",
      };
      receipts.set(requirement.id, cycleReceipt);
      return cycleReceipt;
    }

    visiting.add(requirement.id);
    const blockedDependencies: string[] = [];
    for (const dependencyId of
      requirement.dependsOnRequirementIds) {
      const dependency = byId.get(dependencyId);
      if (!dependency) {
        blockedDependencies.push(
          dependencyId + " (missing node)",
        );
        continue;
      }
      const receipt = resolve(dependency);
      if (receipt.status !== "SATISFIED") {
        blockedDependencies.push(dependencyId);
      }
    }
    visiting.delete(requirement.id);

    if (blockedDependencies.length > 0) {
      const receipt: GameplayKnowledgeReceipt = {
        requirementId: requirement.id,
        scenarioId: requirement.scenarioId,
        domain: requirement.domain,
        status: "BLOCKED_BY_PREREQUISITE",
        subjectIds: [...requirement.subjectIds],
        componentIds: [...requirement.componentIds],
        evidenceIds: [],
        capabilityIdsUsed: [],
        reason:
          "Required prerequisite inspection node(s) are not satisfied: " +
          blockedDependencies.sort().join(", ") +
          ".",
      };
      receipts.set(requirement.id, receipt);
      return receipt;
    }

    const capabilityIdsUsed =
      executedCapabilityIdsForDomain(
        world,
        requirement.domain,
      ).filter((capabilityId) =>
        requirement.capabilityIds.includes(
          capabilityId,
        )
      );
    const evidenceIds =
      domainEvidence(world, requirement.domain);

    if (requirement.capabilityIds.length === 0) {
      const receipt: GameplayKnowledgeReceipt = {
        requirementId: requirement.id,
        scenarioId: requirement.scenarioId,
        domain: requirement.domain,
        status: "CAPABILITY_GAP",
        subjectIds: [...requirement.subjectIds],
        componentIds: [...requirement.componentIds],
        evidenceIds,
        capabilityIdsUsed: [],
        reason:
          "No analysis-planner capability is registered for this required gameplay knowledge domain.",
      };
      receipts.set(requirement.id, receipt);
      return receipt;
    }

    if (
      capabilityIdsUsed.length === 0 ||
      evidenceIds.length === 0
    ) {
      const receipt: GameplayKnowledgeReceipt = {
        requirementId: requirement.id,
        scenarioId: requirement.scenarioId,
        domain: requirement.domain,
        status: "MISSING_REQUIRED_KNOWLEDGE",
        subjectIds: [...requirement.subjectIds],
        componentIds: [...requirement.componentIds],
        evidenceIds: [],
        capabilityIdsUsed: [],
        reason:
          "A registered capability exists, but no matching capability execution receipt returned to the scenario for this required domain.",
      };
      receipts.set(requirement.id, receipt);
      return receipt;
    }

    const receipt: GameplayKnowledgeReceipt = {
      requirementId: requirement.id,
      scenarioId: requirement.scenarioId,
      domain: requirement.domain,
      status: "SATISFIED",
      subjectIds: [...requirement.subjectIds],
      componentIds: [...requirement.componentIds],
      evidenceIds,
      capabilityIdsUsed,
      reason:
        "Required gameplay knowledge is present and tied to executed analysis capability receipt(s): " +
        capabilityIdsUsed.join(", ") +
        ".",
    };
    receipts.set(requirement.id, receipt);
    return receipt;
  };

  for (const requirement of requirements) {
    resolve(requirement);
  }

  return requirements.map(
    (requirement) => receipts.get(requirement.id)!,
  );
}
