import type {
  GameplayIntentEdge,
  GameplayIntentModel,
  GameplayIntentNode,
} from "../../../gameplay-intent/src/index.js";
import type {
  GameplayAuditScenarioPreset,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  GameplayWorldModel,
} from "./gameplay-world-model.js";
import {
  buildGameplayKnowledgeReceipts,
  buildGameplayKnowledgeRequirements,
  gameplayScenarioNeighborhoodNodeIds,
  requiredKnowledgeDomainsForIntentScenario,
  requiredKnowledgeDomainsForPreset,
} from "./gameplay-scenario-knowledge.js";
import type {
  GameplayScenarioComponent,
  GameplayCausalLink,
  GameplayScenarioGraph,
  GameplayScenario,
} from "./gameplay-scenario-model.js";

const SCENARIO_NODE_KINDS = new Set([
  "mechanic",
  "objective",
  "phase",
  "lifecycle",
  "outcome",
]);

function purposeForNode(
  node: GameplayIntentNode,
): string {
  if (node.description?.trim()) {
    return node.description.trim();
  }
  switch (node.kind) {
    case "objective":
      return "Provide or resolve a player-facing objective.";
    case "phase":
      return "Control a material stage of the player journey.";
    case "lifecycle":
      return "Maintain valid gameplay state across entry, active play, exit, cleanup, or recovery.";
    case "mechanic":
      return "Provide gameplay behavior required by one or more player scenarios.";
    case "outcome":
      return "Produce a player-visible gameplay result.";
    case "resource":
      return "Provide a gameplay resource required by another mechanic or state.";
    case "state":
      return "Represent gameplay state consumed by transitions or mechanics.";
    case "actor":
    case "role":
      return "Participate in player-facing gameplay behavior.";
    case "spatial-region":
      return "Provide the world-space context required by gameplay.";
    case "policy":
      return "Constrain gameplay availability, ownership, capacity, or transition rules.";
    case "game":
      return "Represent the selected game's overall gameplay contract.";
    default:
      return "Support selected-artifact gameplay.";
  }
}

function technicalRoleForNode(
  node: GameplayIntentNode,
): string {
  return node.kind + ": " + node.label;
}

function edgeStatus(
  edge: GameplayIntentEdge,
): GameplayCausalLink["status"] {
  if (edge.status === "hypothesis") return "DETECTION_GAP";
  if (edge.evidenceIds.length === 0) return "DETECTION_GAP";
  return "PROVEN";
}

function stageForNode(
  node: GameplayIntentNode,
): string {
  if (node.kind === "phase") return node.label;
  if (node.kind === "objective") return "Objective";
  if (node.kind === "outcome") return "Result / Terminal";
  if (node.kind === "lifecycle") return "Lifecycle / Recovery";
  return "Gameplay";
}

function presetPlayerCounts(
  preset: GameplayAuditScenarioPreset,
): readonly number[] {
  return [...new Set(
    preset.scenarios
      .map((scenario) => scenario.playerCount)
      .filter((value): value is number => value !== undefined),
  )].sort((a, b) => a - b);
}

function runtimeComponents(
  world: GameplayWorldModel,
): readonly Omit<GameplayScenarioComponent, "usedByScenarioIds" | "orphan">[] {
  const output: Omit<GameplayScenarioComponent, "usedByScenarioIds" | "orphan">[] = [];
  if (world.arenas.detected) {
    output.push({
      id: "runtime:arena",
      label: "Arena ownership and capacity",
      kind: "runtime-domain",
      technicalRole: "Arena assignment, concurrency, isolation, cleanup, and reuse.",
      gameplayPurpose: "Keep simultaneous player sessions independent and make visible arena capacity actually playable.",
      evidenceIds: ["world:arena-count"],
    });
  }
  if (
    world.chunks.tickingAreaAcquires > 0 ||
    world.chunks.tickingAreaReadinessStates > 0 ||
    world.chunks.capacityUncheckedLeases > 0 ||
    world.entities.definitions > 0
  ) {
    output.push({
      id: "runtime:chunks",
      label: "Chunk and ticking simulation",
      kind: "runtime-domain",
      technicalRole: "Chunk residency, ticking-area acquisition, readiness, and release.",
      gameplayPurpose: "Keep remote gameplay actors and world logic simulated when progression depends on them.",
      evidenceIds: ["runtime:chunks"],
    });
  }
  if (world.entities.definitions > 0) {
    output.push({
      id: "runtime:entities",
      label: "Entity lifecycle and navigation",
      kind: "runtime-domain",
      technicalRole: "Entity spawn, AI, target, navigation, removal, and lifecycle evidence.",
      gameplayPurpose: "Make configured actors actually spawn, act, move, terminate, and contribute to progression.",
      evidenceIds: ["runtime:entities"],
    });
  }
  if (
    world.combat.hurtHandlers > 0 ||
    world.combat.deathHandlers > 0 ||
    world.combat.damageApplications > 0
  ) {
    output.push({
      id: "runtime:combat",
      label: "Combat lifecycle",
      kind: "runtime-domain",
      technicalRole: "Damage, death, projectile, revive, and combat terminal ownership.",
      gameplayPurpose: "Keep combat outcomes, death, revive, and terminal transitions consistent with player state.",
      evidenceIds: ["runtime:combat"],
    });
  }
  if (world.inventory.regions > 0 || world.inventory.grantRegions > 0) {
    output.push({
      id: "runtime:inventory",
      label: "Inventory and equipment lifecycle",
      kind: "runtime-domain",
      technicalRole: "Inventory grant, reset, drop, equipment, and restore ownership.",
      gameplayPurpose: "Keep kits, items, rewards, death state, reconnect state, and retry state correct for each player.",
      evidenceIds: ["runtime:inventory"],
    });
  }
  if ((world.persistence?.properties ?? 0) > 0) {
    output.push({
      id: "runtime:persistence",
      label: "Persistence and recovery",
      kind: "runtime-domain",
      technicalRole: "Persisted state scope, lifetime, reload, and recovery reconstruction.",
      gameplayPurpose: "Preserve or intentionally restart material gameplay state across reload and reconnect.",
      evidenceIds: ["runtime:persistence"],
    });
  }
  if (
    world.structures.loads > 0 ||
    world.structures.runtimeLogicLoads > 0
  ) {
    output.push({
      id: "runtime:structures",
      label: "World and structure setup",
      kind: "runtime-domain",
      technicalRole: "Structure load, placement, world setup, transition residue, and mutation.",
      gameplayPurpose: "Prepare the playable world state before a stage begins and restore it for later runs.",
      evidenceIds: ["runtime:structures"],
    });
  }
  if (world.economy.sourceKinds.length > 0) {
    output.push({
      id: "runtime:economy",
      label: "Economy and rewards",
      kind: "runtime-domain",
      technicalRole: "Reward sources, score/currency mutation, pickup, and idempotency.",
      gameplayPurpose: "Make progression rewards and scoring match what the player actually achieved.",
      evidenceIds: ["runtime:economy"],
    });
  }
  return output;
}

function runtimeEdgeState(
  componentId: string,
  world: GameplayWorldModel,
): Pick<GameplayCausalLink, "status" | "reason"> {
  switch (componentId) {
    case "runtime:arena": {
      const reduced =
        world.arenas.count !== undefined &&
        world.arenas.safeConcurrentArenas !== undefined &&
        world.arenas.safeConcurrentArenas !== null &&
        world.arenas.safeConcurrentArenas < world.arenas.count;
      const isolationGap =
        world.arenas.isolation.sharedGlobal > 0 ||
        world.arenas.globalState.unleasedArenaMutations > 0;
      if (reduced || isolationGap) {
        return {
          status: "CONTRADICTED",
          reason:
            "Arena analyzer reports reduced playable concurrency or cross-arena ownership/isolation evidence that contradicts the scenario dependency.",
        };
      }
      if (
        world.arenas.isolation.unknown > 0 ||
        world.arenas.globalState.unauditedArenaMutations > 0 ||
        world.arenas.lifecycle.unresolved > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Arena lifecycle/isolation evidence remains unresolved.",
        };
      }
      return {
        status: "PROVEN",
        reason: "Arena ownership/capacity evidence has no unresolved contradiction for this dependency.",
      };
    }
    case "runtime:chunks":
      if (
        world.chunks.tickingAreaAcquires === 0 &&
        world.chunks.tickingAreaReadinessStates === 0 &&
        world.chunks.readinessProbes === 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "This gameplay scenario requires explicit chunk/simulation ownership, but the selected artifact exposes no ticking-area acquisition/readiness mechanism for the dependency.",
        };
      }
      if (
        world.chunks.acquireWithoutRelease > 0 ||
        world.chunks.releaseUnreachable > 0 ||
        world.chunks.capacityUncheckedLeases > 0 ||
        world.chunks.unguardedDeferredChunkWork > 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "Chunk/ticking analysis found lifecycle, capacity, or deferred-work gaps that can break simulation ownership.",
        };
      }
      if (
        world.chunks.readinessUnverifiedLeases > 0 ||
        world.chunks.cleanupOrderUnproven > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Chunk readiness or cleanup ordering remains unproven.",
        };
      }
      return {
        status: "PROVEN",
        reason: "Chunk/ticking ownership is resolved for the mapped gameplay dependency.",
      };
    case "runtime:entities":
      if (
        world.entities.aiStack.targetedStackIncomplete > 0 ||
        world.entities.aiStack.navigationWithoutMovement > 0 ||
        world.entities.aiStack.targetedWithoutNavigation > 0 ||
        world.entities.navigationEnvironment.incompatible > 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "Entity AI/navigation analysis contains an incomplete or incompatible actor path required by gameplay.",
        };
      }
      if (
        world.entities.staticAnalysisLimits > 0 ||
        world.entities.navigationEnvironment.unresolved > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Entity behavior/navigation still has unresolved evidence.",
        };
      }
      return {
        status: "PROVEN",
        reason: "Entity lifecycle/navigation evidence supports the mapped gameplay dependency.",
      };
    case "runtime:combat":
      if (
        world.combat.projectileCleanupGap > 0 ||
        world.combat.hurtOnlyTerminalRisk > 0 ||
        world.combat.policy.reviveContractContradictions > 0 ||
        world.combat.policy.projectileCleanupContractGap > 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "Combat lifecycle analysis found a player-state, terminal, revive, or projectile contradiction.",
        };
      }
      return {
        status: "PROVEN",
        reason: "Combat lifecycle evidence supports the mapped gameplay dependency.",
      };
    case "runtime:inventory":
      if (
        world.inventory.partialResets > 0 ||
        world.inventory.copyMutationRisks > 0 ||
        world.inventory.restoreOwnership.multipleRestoreOwners > 0 ||
        world.inventory.policy.uncoveredItemClasses > 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "Inventory/equipment analysis found reset, ownership, or item-policy gaps affecting player state.",
        };
      }
      if (
        world.inventory.unresolvedEquipmentSlotEvidence > 0 ||
        world.inventory.restoreOwnership.unknownIdentityGrants > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Inventory identity/equipment evidence remains unresolved.",
        };
      }
      return {
        status: "PROVEN",
        reason: "Inventory lifecycle evidence supports the mapped gameplay dependency.",
      };
    case "runtime:persistence":
      if (
        (world.persistence?.appendWithoutClear ?? 0) > 0 ||
        (world.persistence?.worldScopedAppendWithoutClear ?? 0) > 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "Persistence analysis found state that can survive beyond its intended gameplay lifecycle.",
        };
      }
      if (
        (world.persistence?.unknownScope ?? 0) > 0 ||
        (world.persistence?.unknownLifetime ?? 0) > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Persistence scope/lifetime remains unresolved.",
        };
      }
      return {
        status: "PROVEN",
        reason: "Persistence/recovery evidence supports the mapped gameplay dependency.",
      };
    case "runtime:structures":
      if (
        world.structures.unresolvedLoads > 0 ||
        world.structures.transitionResidueRisks > 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "World/structure analysis found unresolved setup or transition-residue behavior.",
        };
      }
      if (world.structures.transitionResidueUnresolved > 0) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Structure transition behavior remains unresolved.",
        };
      }
      return {
        status: "PROVEN",
        reason: "World/structure setup evidence supports the mapped gameplay dependency.",
      };
    case "runtime:economy":
      if (
        world.economy.deathRewardSourceOverlapCandidates > 0 ||
        world.economy.pickupCurrencyWithoutConsumeCandidates > 0 ||
        world.economy.rewardPathsWithoutIdempotency > 0 ||
        world.economy.policy.terminalRewardResultCommitUnproven > 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "Economy/reward analysis found duplicate, unconsumed, non-idempotent, or terminal-commit risk.",
        };
      }
      if (
        world.economy.unresolvedEngineLootTables > 0 ||
        world.economy.deathRewardSourceOverlapUnresolved > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Economy/reward evidence remains unresolved.",
        };
      }
      return {
        status: "PROVEN",
        reason: "Economy/reward evidence supports the mapped gameplay dependency.",
      };
    default:
      return {
        status: "DETECTION_GAP",
        reason: "No runtime-domain resolver is available for this gameplay dependency.",
      };
  }
}

export function compileGameplayScenarioGraph(
  input: {
    readonly intent: GameplayIntentModel;
    readonly world: GameplayWorldModel;
    readonly preset: GameplayAuditScenarioPreset;
  },
): GameplayScenarioGraph {
  const playerCounts = presetPlayerCounts(input.preset);
  const scenarioNodes = input.intent.nodes.filter(
    (node) => SCENARIO_NODE_KINDS.has(node.kind),
  );
  const runtime = runtimeComponents(input.world);
  const runtimeIds = new Set(
    runtime.map((component) => component.id),
  );

  function presetComponentIds(
    kind: GameplayAuditScenarioPreset["scenarios"][number]["kind"],
  ): readonly string[] {
    const selected = new Set<string>();
    const addRuntime = (...ids: string[]) => {
      for (const id of ids) {
        if (runtimeIds.has(id)) selected.add(id);
      }
    };
    const addIntentKinds = (...kinds: GameplayIntentNode["kind"][]) => {
      for (const node of input.intent.nodes) {
        if (kinds.includes(node.kind)) selected.add(node.id);
      }
    };

    switch (kind) {
      case "full-journey":
        // Composition only: concrete child scenarios own runtime knowledge.
        addIntentKinds(
          "phase",
          "mechanic",
          "objective",
          "lifecycle",
          "outcome",
        );
        break;
      case "solo":
      case "two-player":
      case "max-party":
      case "party-capacity-plus-one":
      case "disconnect-reconnect":
        addIntentKinds("lifecycle", "state", "policy", "outcome");
        addRuntime(
          "runtime:arena",
          "runtime:combat",
          "runtime:inventory",
          "runtime:persistence",
        );
        break;
      case "multi-arena-parallel":
      case "arena-capacity-plus-one":
        addIntentKinds("policy", "lifecycle", "state");
        addRuntime("runtime:arena", "runtime:chunks");
        break;
      case "reload-recovery":
        addIntentKinds("lifecycle", "state", "phase");
        addRuntime(
          "runtime:persistence",
          "runtime:arena",
          "runtime:inventory",
          "runtime:combat",
          "runtime:entities",
        );
        break;
      case "deferred-ownership":
        addIntentKinds("lifecycle", "state", "phase", "outcome");
        addRuntime(
          "runtime:arena",
          "runtime:persistence",
          "runtime:chunks",
        );
        break;
      case "terminal-collision":
        addIntentKinds("outcome", "lifecycle", "state", "phase");
        addRuntime(
          "runtime:combat",
          "runtime:arena",
          "runtime:economy",
        );
        break;
      case "repeated-run":
        addIntentKinds("lifecycle", "phase", "state", "outcome");
        addRuntime(
          "runtime:arena",
          "runtime:structures",
          "runtime:entities",
          "runtime:inventory",
          "runtime:economy",
        );
        break;
    }

    return [...selected].sort();
  }

  const scenarioKnowledgeDomains = new Map<string, readonly import("./gameplay-scenario-model.js").GameplayKnowledgeDomain[]>();

  const scenarios: GameplayScenario[] = scenarioNodes.map((node) => {
    const scenarioId = "scenario:" + node.id;
    const requiredDomains =
      requiredKnowledgeDomainsForIntentScenario(
        node,
        input.intent,
        input.world,
      );
    scenarioKnowledgeDomains.set(
      scenarioId,
      requiredDomains,
    );
    const componentIds =
      gameplayScenarioNeighborhoodNodeIds(
        input.intent,
        node.id,
      );
    const causalLinkIds = input.intent.edges
      .filter(
        (edge) =>
          componentIds.includes(edge.from) &&
          componentIds.includes(edge.to),
      )
      .map((edge) => "edge:scenario:" + node.id + ":" + edge.id);

    return {
      id: scenarioId,
      label: node.label,
      gameplayStage: stageForNode(node),
      purpose: purposeForNode(node),
      sourceSubjectIds: [node.id],
      componentIds,
      causalLinkIds,
      playerCounts,
      requiredKnowledgeIds: [],
    };
  });

  for (const presetScenario of input.preset.scenarios) {
    const scenarioId =
      "preset:" + presetScenario.id;
    const requiredDomains =
      requiredKnowledgeDomainsForPreset(
        presetScenario.kind,
        input.world,
      );
    scenarioKnowledgeDomains.set(
      scenarioId,
      requiredDomains,
    );
    const componentIds = presetComponentIds(
      presetScenario.kind,
    );
    scenarios.push({
      id: scenarioId,
      label: presetScenario.kind,
      gameplayStage: "Boundary / Recovery / Variant",
      purpose: presetScenario.reason,
      sourceSubjectIds: [],
      componentIds,
      causalLinkIds: [],
      playerCounts:
        presetScenario.playerCount === undefined
          ? playerCounts
          : [presetScenario.playerCount],
      requiredKnowledgeIds: [],
    });
  }

  const composedDomains = new Set<
    import("./gameplay-scenario-model.js").GameplayKnowledgeDomain
  >();
  for (const [scenarioId, domains] of
    scenarioKnowledgeDomains) {
    const scenario = scenarios.find(
      (item) => item.id === scenarioId,
    );
    if (scenario?.label === "full-journey") {
      continue;
    }
    for (const domain of domains) {
      composedDomains.add(domain);
    }
  }
  for (const scenario of scenarios) {
    if (scenario.label !== "full-journey") {
      continue;
    }
    scenarioKnowledgeDomains.set(
      scenario.id,
      [...composedDomains].sort(),
    );
  }

  const knowledgeRequirements = scenarios.flatMap(
    (scenario) =>
      buildGameplayKnowledgeRequirements(
        scenario.id,
        scenarioKnowledgeDomains.get(scenario.id) ?? [],
        {
          subjectIds: scenario.sourceSubjectIds,
          componentIds: scenario.componentIds,
        },
      ),
  );
  const requirementsByScenario = new Map<
    string,
    readonly string[]
  >();
  for (const scenario of scenarios) {
    requirementsByScenario.set(
      scenario.id,
      knowledgeRequirements
        .filter((item) => item.scenarioId === scenario.id)
        .map((item) => item.id),
    );
  }
  const scenariosWithKnowledge = scenarios.map(
    (scenario) => ({
      ...scenario,
      requiredKnowledgeIds:
        requirementsByScenario.get(scenario.id) ?? [],
    }),
  );

  const scenarioIdsBySubject = new Map<string, Set<string>>();
  for (const scenario of scenariosWithKnowledge) {
    for (const subjectId of scenario.componentIds) {
      const set = scenarioIdsBySubject.get(subjectId) ?? new Set<string>();
      set.add(scenario.id);
      scenarioIdsBySubject.set(subjectId, set);
    }
  }

  const components: GameplayScenarioComponent[] = input.intent.nodes.map((node) => {
    const usedBy = [...(scenarioIdsBySubject.get(node.id) ?? [])].sort();
    return {
      id: node.id,
      label: node.label,
      kind: node.kind,
      technicalRole: technicalRoleForNode(node),
      gameplayPurpose: purposeForNode(node),
      evidenceIds: [...node.evidenceIds],
      usedByScenarioIds: usedBy,
      orphan: usedBy.length === 0 && node.kind !== "game",
    };
  });

  const runtimeDomainKnowledge: Readonly<Record<
    string,
    import("./gameplay-scenario-model.js").GameplayKnowledgeDomain
  >> = {
    "runtime:arena": "arena-lifecycle",
    "runtime:chunks": "chunk-simulation",
    "runtime:entities": "entity-behavior",
    "runtime:combat": "combat-lifecycle",
    "runtime:inventory": "inventory-state",
    "runtime:persistence": "persistence-recovery",
    "runtime:structures": "world-structure",
    "runtime:economy": "economy-reward",
  };

  for (const component of runtime) {
    const requiredDomain =
      runtimeDomainKnowledge[component.id];
    const usedBy = requiredDomain === undefined
      ? []
      : scenariosWithKnowledge
          .filter((scenario) => {
            const domains =
              scenarioKnowledgeDomains.get(
                scenario.id,
              ) ?? [];
            return domains.includes(requiredDomain);
          })
          .map((scenario) => scenario.id);
    components.push({
      ...component,
      usedByScenarioIds: usedBy,
      orphan: usedBy.length === 0,
    });
  }

  const componentIds = new Set(components.map((component) => component.id));
  const causalLinks: GameplayCausalLink[] = [];
  for (const scenario of scenariosWithKnowledge) {
    const allowed = new Set(scenario.componentIds);
    for (const edge of input.intent.edges) {
      if (!allowed.has(edge.from) || !allowed.has(edge.to)) continue;
      if (!componentIds.has(edge.from) || !componentIds.has(edge.to)) continue;
      causalLinks.push({
        id: "edge:" + scenario.id + ":" + edge.id,
        scenarioId: scenario.id,
        fromComponentId: edge.from,
        toComponentId: edge.to,
        purpose:
          edge.description?.trim() ||
          "Prove that " + edge.from + " " + edge.kind + " " + edge.to + " in this gameplay scenario.",
        evidenceIds: [...edge.evidenceIds],
        subjectIds: [
          ...new Set([
            ...scenario.sourceSubjectIds,
            edge.from,
            edge.to,
          ]),
        ].sort(),
        componentIds: [
          ...new Set([
            edge.from,
            edge.to,
          ]),
        ].sort(),
        status: edgeStatus(edge),
        reason:
          edgeStatus(edge) === "PROVEN"
            ? "Selected-artifact evidence connects both gameplay components."
            : "This causal link is not grounded strongly enough to close the scenario.",
      });
    }
  }

  const knowledgeReceipts =
    buildGameplayKnowledgeReceipts(
      knowledgeRequirements,
      input.world,
    );

  const scenarioById = new Map(
    scenariosWithKnowledge.map((scenario) => [
      scenario.id,
      scenario,
    ]),
  );
  for (const component of components.filter((item) => item.kind === "runtime-domain")) {
    for (const scenarioId of component.usedByScenarioIds) {
      const scenario = scenarioById.get(scenarioId);
      if (!scenario) continue;
      const anchorId =
        scenario.sourceSubjectIds[0] ??
        scenario.componentIds.find(
          (id) =>
            !id.startsWith("runtime:") &&
            componentIds.has(id),
        );
      if (!anchorId || !componentIds.has(anchorId)) continue;
      const knowledgeDomain =
        runtimeDomainKnowledge[component.id];
      const requirement =
        knowledgeDomain === undefined
          ? undefined
          : knowledgeRequirements.find(
              (item) =>
                item.scenarioId === scenarioId &&
                item.domain === knowledgeDomain,
            );
      const receipt =
        requirement === undefined
          ? undefined
          : knowledgeReceipts.find(
              (item) =>
                item.requirementId === requirement.id,
            );

      causalLinks.push({
        id: "edge:" + scenarioId + ":" + component.id,
        scenarioId,
        fromComponentId: component.id,
        toComponentId: anchorId,
        purpose: component.gameplayPurpose,
        evidenceIds:
          receipt?.evidenceIds.length
            ? [...receipt.evidenceIds]
            : [...component.evidenceIds],
        subjectIds:
          requirement === undefined
            ? [...scenario.sourceSubjectIds]
            : [...requirement.subjectIds],
        componentIds:
          requirement === undefined
            ? [component.id, anchorId].sort()
            : [
                ...new Set([
                  ...requirement.componentIds,
                  component.id,
                  anchorId,
                ]),
              ].sort(),
        ...(requirement === undefined
          ? {}
          : {
              knowledgeRequirementId:
                requirement.id,
            }),
        ...runtimeEdgeState(
          component.id,
          input.world,
        ),
      });
    }
  }

  return {
    schemaVersion: 1,
    policy: "scenario-driven-causal-audit",
    scenarios: scenariosWithKnowledge,
    components,
    causalLinks,
    knowledgeRequirements,
    knowledgeReceipts,
    requiredInspectionGraph: {
      policy: "required-inspection-graph",
      nodes: knowledgeRequirements,
      receipts: knowledgeReceipts,
    },
  };
}
