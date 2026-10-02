import type {
  GameplayIntentEdge,
  GameplayIntentModel,
  GameplayIntentNode,
} from "../../../gameplay-intent/src/index.js";
import type {
  GameplaySimulationPreset,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  GameplayWorldModel,
} from "./gameplay-world-model.js";
import type {
  GameplayExecutionComponent,
  GameplayExecutionEdge,
  GameplayExecutionGraph,
  GameplayExecutionScenario,
} from "./gameplay-execution-model.js";

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

function relatedNodeIds(
  model: GameplayIntentModel,
  anchorId: string,
): readonly string[] {
  const ids = new Set([anchorId]);
  for (const edge of model.edges) {
    if (edge.from === anchorId) ids.add(edge.to);
    if (edge.to === anchorId) ids.add(edge.from);
  }
  return [...ids];
}

function edgeStatus(
  edge: GameplayIntentEdge,
): GameplayExecutionEdge["status"] {
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
  preset: GameplaySimulationPreset,
): readonly number[] {
  return [...new Set(
    preset.scenarios
      .map((scenario) => scenario.playerCount)
      .filter((value): value is number => value !== undefined),
  )].sort((a, b) => a - b);
}

function runtimeComponents(
  world: GameplayWorldModel,
): readonly Omit<GameplayExecutionComponent, "usedByScenarioIds" | "orphan">[] {
  const output: Omit<GameplayExecutionComponent, "usedByScenarioIds" | "orphan">[] = [];
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
    world.chunks.capacityUncheckedLeases > 0
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

function runtimeScenarioAffinity(
  componentId: string,
  scenario: GameplayExecutionScenario,
): boolean {
  const haystack = (
    scenario.label + " " +
    scenario.gameplayStage + " " +
    scenario.purpose
  ).toLowerCase();

  if (componentId === "runtime:arena") {
    return /arena|session|join|ready|cleanup|reuse|queue|capacity|player/.test(haystack);
  }
  if (componentId === "runtime:chunks") {
    return /enemy|entity|wave|spawn|world|structure|objective|gameplay/.test(haystack);
  }
  if (componentId === "runtime:entities") {
    return /enemy|entity|npc|wave|combat|objective|spawn/.test(haystack);
  }
  if (componentId === "runtime:combat") {
    return /combat|enemy|death|revive|respawn|defeat|victory/.test(haystack);
  }
  if (componentId === "runtime:inventory") {
    return /inventory|kit|item|shop|reward|death|respawn|retry|reconnect/.test(haystack);
  }
  if (componentId === "runtime:persistence") {
    return /reload|reconnect|recovery|retry|state|lifecycle|cleanup/.test(haystack);
  }
  if (componentId === "runtime:structures") {
    return /setup|world|structure|level|stage|transition|cleanup|gameplay/.test(haystack);
  }
  if (componentId === "runtime:economy") {
    return /reward|score|currency|shop|victory|result|completion/.test(haystack);
  }
  return false;
}

export function compileGameplayExecutionGraph(
  input: {
    readonly intent: GameplayIntentModel;
    readonly world: GameplayWorldModel;
    readonly preset: GameplaySimulationPreset;
  },
): GameplayExecutionGraph {
  const playerCounts = presetPlayerCounts(input.preset);
  const scenarioNodes = input.intent.nodes.filter(
    (node) => SCENARIO_NODE_KINDS.has(node.kind),
  );

  const scenarios: GameplayExecutionScenario[] = scenarioNodes.map((node) => {
    const componentIds = relatedNodeIds(input.intent, node.id);
    const causalEdgeIds = input.intent.edges
      .filter(
        (edge) =>
          componentIds.includes(edge.from) &&
          componentIds.includes(edge.to),
      )
      .map((edge) => "edge:" + node.id + ":" + edge.id);

    return {
      id: "scenario:" + node.id,
      label: node.label,
      gameplayStage: stageForNode(node),
      purpose: purposeForNode(node),
      sourceSubjectIds: [node.id],
      componentIds,
      causalEdgeIds,
      playerCounts,
    };
  });

  for (const presetScenario of input.preset.scenarios) {
    scenarios.push({
      id: "preset:" + presetScenario.id,
      label: presetScenario.kind,
      gameplayStage: "Boundary / Recovery / Variant",
      purpose: presetScenario.reason,
      sourceSubjectIds: [],
      componentIds: [],
      causalEdgeIds: [],
      playerCounts:
        presetScenario.playerCount === undefined
          ? playerCounts
          : [presetScenario.playerCount],
    });
  }

  const scenarioIdsBySubject = new Map<string, Set<string>>();
  for (const scenario of scenarios) {
    for (const subjectId of scenario.componentIds) {
      const set = scenarioIdsBySubject.get(subjectId) ?? new Set<string>();
      set.add(scenario.id);
      scenarioIdsBySubject.set(subjectId, set);
    }
  }

  const components: GameplayExecutionComponent[] = input.intent.nodes.map((node) => {
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

  const runtime = runtimeComponents(input.world);
  for (const component of runtime) {
    const usedBy = scenarios
      .filter((scenario) => runtimeScenarioAffinity(component.id, scenario))
      .map((scenario) => scenario.id);
    components.push({
      ...component,
      usedByScenarioIds: usedBy,
      orphan: usedBy.length === 0,
    });
  }

  const componentIds = new Set(components.map((component) => component.id));
  const edges: GameplayExecutionEdge[] = [];
  for (const scenario of scenarios) {
    const allowed = new Set(scenario.componentIds);
    for (const edge of input.intent.edges) {
      if (!allowed.has(edge.from) || !allowed.has(edge.to)) continue;
      if (!componentIds.has(edge.from) || !componentIds.has(edge.to)) continue;
      edges.push({
        id: "edge:" + scenario.id + ":" + edge.id,
        scenarioId: scenario.id,
        fromComponentId: edge.from,
        toComponentId: edge.to,
        purpose:
          edge.description?.trim() ||
          "Prove that " + edge.from + " " + edge.kind + " " + edge.to + " in this gameplay scenario.",
        evidenceIds: [...edge.evidenceIds],
        status: edgeStatus(edge),
        reason:
          edgeStatus(edge) === "PROVEN"
            ? "Selected-artifact evidence connects both gameplay components."
            : "This causal link is not grounded strongly enough to close the scenario.",
      });
    }
  }

  const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  for (const component of components.filter((item) => item.kind === "runtime-domain")) {
    for (const scenarioId of component.usedByScenarioIds) {
      const scenario = scenarioById.get(scenarioId);
      if (!scenario) continue;
      const anchorId = scenario.sourceSubjectIds[0];
      if (!anchorId || !componentIds.has(anchorId)) continue;
      edges.push({
        id: "edge:" + scenarioId + ":" + component.id,
        scenarioId,
        fromComponentId: component.id,
        toComponentId: anchorId,
        purpose: component.gameplayPurpose,
        evidenceIds: [...component.evidenceIds],
        status: component.evidenceIds.length > 0 ? "PROVEN" : "DETECTION_GAP",
        reason:
          component.evidenceIds.length > 0
            ? "Runtime-domain evidence is mapped to a concrete gameplay scenario."
            : "Runtime-domain component has no selected-artifact evidence for this scenario.",
      });
    }
  }

  return {
    schemaVersion: 1,
    policy: "scenario-driven-causal-execution",
    scenarios,
    components,
    edges,
  };
}
