import {
  BUILTIN_ANALYSIS_CAPABILITIES,
  createAnalysisCapabilityRegistry,
  type AnalysisExecutionContext,
} from "../../../analysis-planner/src/index.js";
import type {
  GameplayIntentEdge,
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

const DOMAIN_CAPABILITY_IDS: Readonly<Record<
  GameplayKnowledgeDomain,
  readonly string[]
>> = {
  "state-flow": [
    "semantic-ir-state-model",
  ],
  "arena-lifecycle": [
    "arena-lifecycle-integrity",
  ],
  "multiplayer-interleaving": [
    "multiplayer-interleaving",
  ],
  "chunk-simulation": [
    "chunk-lifecycle-integrity",
  ],
  "entity-behavior": [
    "entity-ai-navigation-readiness",
  ],
  "combat-lifecycle": [
    "combat-lifecycle-contract",
  ],
  "inventory-state": [
    "inventory-lifecycle-integrity",
  ],
  "persistence-recovery": [
    "persistence-lifecycle-integrity",
  ],
  "world-structure": [
    "structure-transition-integrity",
  ],
  "economy-reward": [
    "economy-reward-integrity",
  ],
  "spatial-authority": [
    "script-spatial-integrity",
  ],
  "temporal-ownership": [
    "temporal-ownership-integrity",
  ],
};

const DOMAIN_DEPENDENCIES: Readonly<Partial<Record<
  GameplayKnowledgeDomain,
  readonly GameplayKnowledgeDomain[]
>>> = {
  "arena-lifecycle": ["state-flow"],
  "multiplayer-interleaving": [
    "state-flow",
    "arena-lifecycle",
  ],
  "chunk-simulation": ["state-flow"],
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
};

function capabilityIdsForDomain(
  domain: GameplayKnowledgeDomain,
  context: AnalysisExecutionContext,
): readonly string[] {
  const byId = new Map(
    registry.capabilities.map((capability) => [
      capability.id,
      capability,
    ]),
  );
  return DOMAIN_CAPABILITY_IDS[domain]
    .filter((id) => {
      const capability = byId.get(id);
      return (
        capability !== undefined &&
        capability.contexts.includes(context) &&
        capability.evidenceLevel !== "runtime" &&
        capability.evidenceLevel !== "intervention"
      );
    })
    .sort();
}

function domainExecuted(
  world: GameplayWorldModel,
  domain: GameplayKnowledgeDomain,
): boolean {
  const executed = new Set(
    world.analysisExecution.executedCapabilityIds,
  );
  return DOMAIN_CAPABILITY_IDS[domain]
    .some((capabilityId) => executed.has(capabilityId));
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
  }
}

function add(
  domains: Set<GameplayKnowledgeDomain>,
  domain: GameplayKnowledgeDomain,
): void {
  domains.add(domain);
}

function semanticDomains(
  node: GameplayIntentNode,
  model: GameplayIntentModel,
  world: GameplayWorldModel,
): Set<GameplayKnowledgeDomain> {
  const domains = new Set<GameplayKnowledgeDomain>([
    "state-flow",
  ]);

  const relatedIds = new Set([node.id]);
  const relatedEdges: GameplayIntentEdge[] = [];
  for (const edge of model.edges) {
    if (edge.from === node.id || edge.to === node.id) {
      relatedEdges.push(edge);
      relatedIds.add(edge.from);
      relatedIds.add(edge.to);
    }
  }
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
        world.entities.definitions > 0
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
      for (const domain of Object.keys(DOMAIN_CAPABILITY_IDS) as GameplayKnowledgeDomain[]) {
        if (domain !== "temporal-ownership") {
          addIfApplicable(domain);
        }
      }
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
  return [...semanticDomains(node, model, world)]
    .filter((domain) => applicable(world, domain))
    .sort();
}

export function buildGameplayKnowledgeRequirements(
  scenarioId: string,
  domains: readonly GameplayKnowledgeDomain[],
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
    };
  });
}

export function buildGameplayKnowledgeReceipts(
  requirements: readonly GameplayKnowledgeRequirement[],
  world: GameplayWorldModel,
): readonly GameplayKnowledgeReceipt[] {
  const ordered = [...requirements].sort(
    (left, right) =>
      left.dependsOnRequirementIds.length -
        right.dependsOnRequirementIds.length ||
      left.id.localeCompare(right.id),
  );
  const receipts = new Map<
    string,
    GameplayKnowledgeReceipt
  >();

  for (const requirement of ordered) {
    const blockedDependencies =
      requirement.dependsOnRequirementIds.filter(
        (dependencyId) =>
          receipts.get(dependencyId)?.status !==
          "SATISFIED",
      );

    if (blockedDependencies.length > 0) {
      receipts.set(requirement.id, {
        requirementId: requirement.id,
        scenarioId: requirement.scenarioId,
        domain: requirement.domain,
        status: "BLOCKED_BY_PREREQUISITE",
        evidenceIds: [],
        reason:
          "Required prerequisite inspection node(s) are not satisfied: " +
          blockedDependencies.join(", ") +
          ".",
      });
      continue;
    }

    const evidenceIds =
      domainEvidence(world, requirement.domain);
    if (requirement.capabilityIds.length === 0) {
      receipts.set(requirement.id, {
        requirementId: requirement.id,
        scenarioId: requirement.scenarioId,
        domain: requirement.domain,
        status: "CAPABILITY_GAP",
        evidenceIds,
        reason:
          "No analysis-planner capability is registered for this required gameplay knowledge domain.",
      });
      continue;
    }
    if (evidenceIds.length === 0) {
      receipts.set(requirement.id, {
        requirementId: requirement.id,
        scenarioId: requirement.scenarioId,
        domain: requirement.domain,
        status: "MISSING_REQUIRED_KNOWLEDGE",
        evidenceIds: [],
        reason:
          "A registered capability exists, but no execution receipt returned to the scenario for this required domain.",
      });
      continue;
    }

    receipts.set(requirement.id, {
      requirementId: requirement.id,
      scenarioId: requirement.scenarioId,
      domain: requirement.domain,
      status: "SATISFIED",
      evidenceIds,
      reason:
        "Required gameplay knowledge is present and available to the scenario causal analysis.",
    });
  }

  return requirements.map(
    (requirement) => receipts.get(requirement.id)!,
  );
}
