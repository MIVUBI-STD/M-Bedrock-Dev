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

function presetAnchorIds(
  kind: GameplayAuditScenarioPreset["scenarios"][number]["kind"],
  intent: GameplayIntentModel,
): readonly string[] {
  const preferredKinds: readonly GameplayIntentNode["kind"][] =
    kind === "multi-arena-parallel" ||
    kind === "arena-replica-integrity" ||
    kind === "arena-capacity-plus-one"
      ? ["policy", "lifecycle", "state"]
      : kind === "disconnect-reconnect" ||
        kind === "reload-recovery" ||
        kind === "repeated-run"
        ? ["lifecycle", "state", "outcome"]
        : kind === "terminal-collision"
          ? ["outcome", "lifecycle", "state"]
          : kind === "deferred-ownership"
            ? ["lifecycle", "state", "phase"]
            : kind === "full-journey"
              ? ["phase", "objective", "outcome"]
              : ["state", "lifecycle", "policy"];

  const authored = intent.nodes.filter(
    (node) =>
      preferredKinds.includes(node.kind) &&
      node.status !== "hypothesis",
  );

  const ranked = authored.sort((a, b) => {
    const kindRank = (node: GameplayIntentNode) =>
      preferredKinds.indexOf(node.kind);
    return (
      kindRank(a) - kindRank(b) ||
      a.id.localeCompare(b.id)
    );
  });

  return ranked.slice(0, 3).map((node) => node.id);
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

function normalizedLocator(value: string): string {
  return value.replaceAll("\\", "/").toLowerCase();
}

function scriptMatchesScenarioScope(
  scriptId: string,
  sourceLocators: readonly string[],
): boolean {
  const script = normalizedLocator(scriptId);
  return sourceLocators.some((locator) => {
    const normalized = normalizedLocator(locator);
    return (
      normalized === script ||
      normalized.endsWith("/" + script) ||
      normalized.includes("/" + script + ".") ||
      script.endsWith("/" + normalized)
    );
  });
}

function scopedByScript<T extends { scriptId: string }>(
  items: readonly T[],
  sourceLocators: readonly string[],
): readonly T[] {
  if (sourceLocators.length === 0) return [];
  return items.filter((item) =>
    scriptMatchesScenarioScope(
      item.scriptId,
      sourceLocators,
    )
  );
}

function identifierMatchesScenarioScope(
  identifier: string,
  sourceLocators: readonly string[],
): boolean {
  if (sourceLocators.length === 0) return false;
  const raw = normalizedLocator(identifier);
  const tail = raw.split(":").at(-1) ?? raw;
  return sourceLocators.some((locator) => {
    const normalized = normalizedLocator(locator).split("#")[0]!;
    const basename =
      normalized.split("/").at(-1)?.replace(/\.[^.]+$/, "") ?? normalized;
    return (
      normalized.includes(raw) ||
      basename === tail ||
      normalized.endsWith("/" + tail) ||
      normalized.includes("/" + tail + ".")
    );
  });
}

function aggregateCannotBeScoped(
  aggregateProblem: boolean,
  sourceLocators: readonly string[],
  scopedCount: number,
  domain: string,
): Pick<GameplayCausalLink, "status" | "reason"> | undefined {
  if (
    aggregateProblem &&
    sourceLocators.length > 0 &&
    scopedCount === 0
  ) {
    return {
      status: "DETECTION_GAP",
      reason:
        domain +
        " problems exist elsewhere in the selected artifact, but none are source-correlated to this scenario. Do not promote a domain-global contradiction into this scenario.",
    };
  }
  return undefined;
}


function runtimeEdgeState(
  componentId: string,
  world: GameplayWorldModel,
  sourceLocators: readonly string[] = [],
  scenarioKind?: GameplayAuditScenarioPreset["scenarios"][number]["kind"] | string,
): Pick<GameplayCausalLink, "status" | "reason"> {
  switch (componentId) {
    case "runtime:arena": {
      if (scenarioKind === "arena-replica-integrity") {
        if (world.arenas.replicaIntegrity.diverged > 0) {
          return {
            status: "CONTRADICTED",
            reason:
              "One or more configured arena replicas diverge from the canonical arena. Replica divergence must be classified for gameplay materiality before baseline safety can be reused.",
          };
        }
        if (
          world.arenas.replicaIntegrity.incomplete > 0 ||
          world.arenas.replicaIntegrity.noProof > 0 ||
          world.arenas.replicaIntegrity.bounded > 0
        ) {
          return {
            status: "DETECTION_GAP",
            reason:
              "Arena replica proof is incomplete or bounded. A configured/playable replica cannot inherit canonical arena safety until world/topology proof is complete or every material delta is classified.",
          };
        }
      }

      const reduced =
        world.arenas.count !== undefined &&
        world.arenas.safeConcurrentArenas !== undefined &&
        world.arenas.safeConcurrentArenas !== null &&
        world.arenas.safeConcurrentArenas < world.arenas.count;
      const scopedIsolation = scopedByScript(
        world.arenas.isolation.observations,
        sourceLocators,
      );
      const mutationById = new Map(
        world.arenas.globalState.mutations.map((item) => [
          item.id,
          item,
        ]),
      );
      const scopedGlobalAssessments =
        world.arenas.globalState.assessments.filter((item) => {
          const mutation = mutationById.get(item.mutationId);
          return (
            mutation !== undefined &&
            scriptMatchesScenarioScope(
              mutation.ownerId,
              sourceLocators,
            )
          );
        });
      const isolationGap =
        scopedIsolation.some(
          (item) => item.status === "shared-global",
        ) ||
        scopedGlobalAssessments.some(
          (item) => item.status === "unleased",
        );
      if (reduced || isolationGap) {
        return {
          status: "CONTRADICTED",
          reason:
            reduced
              ? "Selected-artifact arena capacity is player-visible at " +
                String(world.arenas.count) +
                " arena(s), but only " +
                String(world.arenas.safeConcurrentArenas) +
                " can run concurrently. Queue/fallback behavior and platform/resource limits explain or mitigate the implementation constraint but are not counter-proof for the gameplay/design capacity mismatch."
              : "Cross-arena ownership/isolation evidence contradicts the scenario dependency.",
        };
      }
      if (
        scopedIsolation.some(
          (item) =>
            item.status === "unknown" ||
            item.status === "partition-proof-required",
        ) ||
        scopedGlobalAssessments.some(
          (item) =>
            item.status === "partial-lease-evidence" ||
            !item.audited,
        ) ||
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
    case "runtime:chunks": {
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

      const badStatuses = new Set([
        "acquire-without-release",
        "release-unreachable",
        "capacity-unchecked",
      ]);
      const unresolvedStatuses = new Set([
        "readiness-unverified",
        "cleanup-order-unproven",
        "dynamic-key",
      ]);
      const scopedLeases =
        sourceLocators.length === 0
          ? []
          : world.chunks.leases.filter((lease) =>
              scriptMatchesScenarioScope(
                lease.scriptId,
                sourceLocators,
              )
            );
      const scopedBad = scopedLeases.filter((lease) =>
        badStatuses.has(lease.status)
      );
      const scopedUnresolved = scopedLeases.filter((lease) =>
        unresolvedStatuses.has(lease.status)
      );

      if (scopedBad.length > 0) {
        return {
          status: "CONTRADICTED",
          reason:
            "Scoped chunk/ticking lease evidence for this scenario contains: " +
            scopedBad
              .map((lease) =>
                lease.scriptId +
                ":" +
                (lease.leaseKey ?? "<dynamic>") +
                "=" +
                lease.status
              )
              .join(", ") +
            ".",
        };
      }

      if (scopedUnresolved.length > 0) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Scoped chunk/ticking lease evidence for this scenario remains unresolved: " +
            scopedUnresolved
              .map((lease) =>
                lease.scriptId +
                ":" +
                (lease.leaseKey ?? "<dynamic>") +
                "=" +
                lease.status
              )
              .join(", ") +
            ".",
        };
      }

      const aggregateProblem =
        world.chunks.acquireWithoutRelease > 0 ||
        world.chunks.releaseUnreachable > 0 ||
        world.chunks.capacityUncheckedLeases > 0 ||
        world.chunks.unguardedDeferredChunkWork > 0 ||
        world.chunks.readinessUnverifiedLeases > 0 ||
        world.chunks.cleanupOrderUnproven > 0;

      if (
        aggregateProblem &&
        sourceLocators.length > 0 &&
        scopedLeases.length === 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Chunk/ticking problems exist elsewhere in the selected artifact, but none are source-correlated to this scenario. Do not contaminate this scenario with a domain-global contradiction.",
        };
      }

      return {
        status: "PROVEN",
        reason:
          "Chunk/ticking ownership has no scoped contradiction for the mapped gameplay dependency.",
      };
    }
    case "runtime:entities": {
      const scopedAi = world.entities.aiStack.assessments.filter(
        (item) =>
          identifierMatchesScenarioScope(
            item.entityKey,
            sourceLocators,
          ),
      );
      const scopedNavigation =
        world.entities.navigationEnvironment.assessments.filter(
          (item) =>
            identifierMatchesScenarioScope(
              item.entityKey,
              sourceLocators,
            ),
        );
      const badAi = scopedAi.filter(
        (item) =>
          item.status === "targeted-stack-incomplete" ||
          (
            item.missingSurfaces.includes("navigation") ||
            item.missingSurfaces.includes("movement")
          ),
      );
      const badNavigation = scopedNavigation.filter(
        (item) => item.status === "incompatible",
      );
      if (badAi.length > 0 || badNavigation.length > 0) {
        return {
          status: "CONTRADICTED",
          reason:
            "Scenario-scoped entity AI/navigation evidence contains an incomplete or incompatible actor path.",
        };
      }
      if (
        scopedNavigation.some(
          (item) =>
            item.status === "unresolved" ||
            item.status === "state-dependent",
        )
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Scenario-scoped entity navigation remains unresolved or state-dependent.",
        };
      }
      const aggregateProblem =
        world.entities.aiStack.targetedStackIncomplete > 0 ||
        world.entities.aiStack.navigationWithoutMovement > 0 ||
        world.entities.aiStack.targetedWithoutNavigation > 0 ||
        world.entities.navigationEnvironment.incompatible > 0;
      if (
        aggregateProblem &&
        sourceLocators.length > 0 &&
        scopedAi.length === 0 &&
        scopedNavigation.length === 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Entity AI/navigation problems exist in the selected artifact, but none can be correlated to this scenario's actor/source scope.",
        };
      }
      if (
        sourceLocators.length === 0 &&
        aggregateProblem
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Entity AI/navigation contains aggregate problems, but this scenario has no actor/source locator strong enough for scoped contradiction.",
        };
      }
      if (
        world.entities.staticAnalysisLimits > 0 &&
        scopedAi.length === 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Entity behavior has static-analysis limitations and no scoped actor proof for this scenario.",
        };
      }
      return {
        status: "PROVEN",
        reason:
          "Entity lifecycle/navigation has no scoped contradiction for the mapped gameplay dependency.",
      };
    }
    case "runtime:combat": {
      const scopedPaths = scopedByScript(
        world.combat.paths,
        sourceLocators,
      );
      const scopedProjectileGap = scopedPaths.some(
        (item) =>
          item.projectileSpawns > 0 &&
          item.projectileRemovals === 0,
      );
      const scopedHurtOnly =
        scopedPaths.some((item) => item.event === "hurt") &&
        !scopedPaths.some((item) => item.event === "death");
      if (
        scopedProjectileGap ||
        scopedHurtOnly ||
        world.combat.policy.reviveContractContradictions > 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "Scoped combat path or authored combat contract contradicts the gameplay dependency.",
        };
      }
      const contamination = aggregateCannotBeScoped(
        world.combat.projectileCleanupGap > 0 ||
        world.combat.hurtOnlyTerminalRisk > 0,
        sourceLocators,
        scopedPaths.length,
        "Combat lifecycle",
      );
      if (contamination) return contamination;
      return {
        status: "PROVEN",
        reason:
          "Combat lifecycle has no scoped contradiction for the mapped gameplay dependency.",
      };
    }
    case "runtime:inventory": {
      const scopedAssessments = scopedByScript(
        world.inventory.assessments,
        sourceLocators,
      );
      const bad = scopedAssessments.filter(
        (item) =>
          item.status === "partial-reset" ||
          item.status === "copy-writeback-risk",
      );
      if (
        bad.length > 0 ||
        world.inventory.restoreOwnership.multipleRestoreOwners > 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "Scoped inventory lifecycle contains partial reset/copy-writeback risk or restore ownership conflict.",
        };
      }
      const contamination = aggregateCannotBeScoped(
        world.inventory.partialResets > 0 ||
        world.inventory.copyMutationRisks > 0,
        sourceLocators,
        scopedAssessments.length,
        "Inventory lifecycle",
      );
      if (contamination) return contamination;
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
        reason:
          "Inventory lifecycle has no scoped contradiction for the mapped gameplay dependency.",
      };
    }
    case "runtime:persistence": {
      const scopedProperties = scopedByScript(
        world.persistence?.propertiesDetail ?? [],
        sourceLocators,
      );
      const bad = scopedProperties.filter(
        (item) =>
          item.growth === "append-without-clear" &&
          (
            item.scope === "world" ||
            item.lifetime === "world" ||
            item.lifetime === "unknown"
          ),
      );
      if (bad.length > 0) {
        return {
          status: "CONTRADICTED",
          reason:
            "Scoped persistence property can outlive the intended gameplay lifecycle without a clear/reset path: " +
            bad.map((item) =>
              item.scriptId + ":" + item.propertyId
            ).join(", ") +
            ".",
        };
      }
      const contamination = aggregateCannotBeScoped(
        (world.persistence?.appendWithoutClear ?? 0) > 0,
        sourceLocators,
        scopedProperties.length,
        "Persistence",
      );
      if (contamination) return contamination;
      if (
        scopedProperties.some(
          (item) =>
            item.scope === "unknown" ||
            item.lifetime === "unknown",
        )
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Scoped persistence scope/lifetime remains unresolved.",
        };
      }
      return {
        status: "PROVEN",
        reason:
          "Persistence/recovery has no scoped contradiction for the mapped gameplay dependency.",
      };
    }
    case "runtime:structures": {
      const scopedLoads =
        world.structures.loadCorrelations.filter(
          (item) =>
            scriptMatchesScenarioScope(
              item.functionId,
              sourceLocators,
            ),
        );
      const scopedTransitions =
        world.structures.transitionResidue.filter(
          (item) =>
            scriptMatchesScenarioScope(
              item.functionId,
              sourceLocators,
            ),
        );
      const missingLoads = scopedLoads.filter(
        (item) =>
          item.status === "missing" ||
          item.status === "ambiguous",
      );
      if (missingLoads.length > 0) {
        return {
          status: "CONTRADICTED",
          reason:
            "Scenario-scoped structure load does not resolve to exactly one selected-artifact structure definition.",
        };
      }
      if (
        scopedTransitions.some(
          (item) =>
            item.status === "incomplete" ||
            item.preservedByVoid > 0,
        )
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Scenario-scoped structure transition has residue/incomplete evidence. This is not promoted to a defect without a grounded reset/replacement contract.",
        };
      }
      const aggregateProblem =
        world.structures.unresolvedLoads > 0 ||
        world.structures.transitionResidueRisks > 0 ||
        world.structures.transitionResidueUnresolved > 0;
      if (
        aggregateProblem &&
        sourceLocators.length > 0 &&
        scopedLoads.length === 0 &&
        scopedTransitions.length === 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Structure problems exist elsewhere in the selected artifact, but none are source-correlated to this scenario.",
        };
      }
      if (aggregateProblem && sourceLocators.length === 0) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Structure analysis contains aggregate problems, but this scenario lacks source scope for a safe contradiction.",
        };
      }
      return {
        status: "PROVEN",
        reason:
          "World/structure setup has no scoped contradiction for the mapped gameplay dependency.",
      };
    }
    case "runtime:economy": {
      const scopedPaths = scopedByScript(
        world.economy.paths,
        sourceLocators,
      );
      const bad = scopedPaths.filter(
        (item) =>
          (
            item.trigger === "pickup" &&
            (item.scoreCredits > 0 || item.scoreWrites > 0) &&
            item.itemConsumes === 0
          ) ||
          (
            (item.inventoryGrants > 0 ||
              item.worldDrops > 0 ||
              item.lootCommands > 0 ||
              item.scoreCredits > 0 ||
              item.scoreWrites > 0) &&
            item.idempotencyGuards === 0
          ),
      );
      if (
        bad.length > 0 ||
        world.economy.policy.deathRewardOverlapContractConflicts > 0 ||
        world.economy.policy.pickupCurrencyContractMismatch > 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "Scoped reward path or authored economy contract contains duplicate/non-idempotent/unconsumed reward behavior.",
        };
      }
      const contamination = aggregateCannotBeScoped(
        world.economy.pickupCurrencyWithoutConsumeCandidates > 0 ||
        world.economy.rewardPathsWithoutIdempotency > 0,
        sourceLocators,
        scopedPaths.length,
        "Economy/reward",
      );
      if (contamination) return contamination;
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
        reason:
          "Economy/reward has no scoped contradiction for the mapped gameplay dependency.",
      };
    }
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
      case "arena-replica-integrity":
        addIntentKinds("policy", "lifecycle", "state", "spatial-region");
        addRuntime("runtime:arena", "runtime:structures");
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
      composedScenarioIds: [],
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
    const sourceSubjectIds =
      presetAnchorIds(
        presetScenario.kind,
        input.intent,
      );
    scenarios.push({
      id: scenarioId,
      label: presetScenario.kind,
      gameplayStage: presetScenario.flowStage,
      purpose: presetScenario.reason,
      sourceSubjectIds,
      componentIds,
      causalLinkIds: [],
      playerCounts:
        presetScenario.playerCount === undefined
          ? playerCounts
          : [presetScenario.playerCount],
      requiredKnowledgeIds: [],
      composedScenarioIds: [],
    });
  }

  const concreteScenarioIds = scenarios
    .filter((scenario) => scenario.label !== "full-journey")
    .map((scenario) => scenario.id)
    .sort();

  const scenariosWithComposition = scenarios.map(
    (scenario) =>
      scenario.label === "full-journey"
        ? {
            ...scenario,
            causalLinkIds: [],
            composedScenarioIds:
              concreteScenarioIds,
          }
        : scenario,
  );

  const knowledgeRequirements = scenariosWithComposition.flatMap(
    (scenario) =>
      buildGameplayKnowledgeRequirements(
        scenario.id,
        scenario.label === "full-journey"
          ? []
          : scenarioKnowledgeDomains.get(scenario.id) ?? [],
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
  for (const scenario of scenariosWithComposition) {
    requirementsByScenario.set(
      scenario.id,
      knowledgeRequirements
        .filter((item) => item.scenarioId === scenario.id)
        .map((item) => item.id),
    );
  }
  const scenariosWithKnowledge = scenariosWithComposition.map(
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
    if (scenario.label === "full-journey") continue;
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
        intentEdgeKind: edge.kind,
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
        scenario.sourceSubjectIds.find(
          (id) => componentIds.has(id),
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
      const sourceEvidenceIds = new Set(
        [
          ...(requirement?.subjectIds ?? []),
          ...(requirement?.componentIds ?? []),
        ].flatMap((id) => {
          const node = input.intent.nodes.find(
            (item) => item.id === id,
          );
          return node?.evidenceIds ?? [];
        }),
      );
      const sourceLocators = input.intent.evidence
        .filter(
          (item) =>
            sourceEvidenceIds.has(item.id) &&
            item.scope === "selected-artifact",
        )
        .map((item) => item.locator)
        .filter(Boolean);

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
          sourceLocators,
          scenario.label,
        ),
      });
    }
  }

  const scenariosWithCausalLinks =
    scenariosWithKnowledge.map((scenario) => ({
      ...scenario,
      causalLinkIds: causalLinks
        .filter(
          (link) =>
            link.scenarioId === scenario.id,
        )
        .map((link) => link.id)
        .sort(),
    }));

  return {
    schemaVersion: 1,
    policy: "scenario-driven-causal-audit",
    scenarios: scenariosWithCausalLinks,
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
