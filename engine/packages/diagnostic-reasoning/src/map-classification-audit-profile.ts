import type {
  AnalysisKnowledgeDomain,
} from "../../analysis-planner/src/index.js";
import {
  isResolvedMapClassification,
  type GameDesignMapClassification,
  type GameDesignMapType,
  type GameDesignMechanicTag,
} from "../../game-design-spec/src/index.js";

export interface MapClassificationAuditSignals {
  readonly hasMultiArena: boolean;
  readonly hasPersistence: boolean;
  readonly hasDeferredWork: boolean;
  readonly hasRepeatedRunSurface: boolean;
  readonly hasTransactionalGameplay: boolean;
  readonly hasSimulationDistanceDependency: boolean;
  readonly hasProgressionActorSurface: boolean;
  readonly hasPlayerFeedbackSurface: boolean;
}

export interface MapClassificationAuditProfile {
  readonly active: boolean;
  readonly requiredKnowledgeDomains:
    readonly AnalysisKnowledgeDomain[];
  readonly signals: MapClassificationAuditSignals;
}

const TYPE_DOMAINS: Readonly<
  Record<
    GameDesignMapType,
    readonly AnalysisKnowledgeDomain[]
  >
> = {
  BUILDING: [
    "state-flow",
    "inventory-state",
    "world-structure",
    "spatial-authority",
  ],
  COMBAT: [
    "state-flow",
    "combat-lifecycle",
    "inventory-state",
    "temporal-ownership",
  ],
  SURVIVAL: [
    "state-flow",
    "combat-lifecycle",
    "entity-behavior",
    "temporal-ownership",
  ],
  STRATEGY: [
    "state-flow",
    "economy-reward",
    "temporal-ownership",
  ],
  SEARCH_PUZZLE: [
    "state-flow",
    "world-structure",
    "spatial-authority",
  ],
  CHALLENGE_COURSE: [
    "state-flow",
    "inventory-state",
    "persistence-recovery",
    "temporal-ownership",
  ],
  SKILL_COURSE: [
    "state-flow",
    "persistence-recovery",
    "platform-constraints",
  ],
};

const MECHANIC_DOMAINS: Readonly<
  Partial<
    Record<
      GameDesignMechanicTag,
      readonly AnalysisKnowledgeDomain[]
    >
  >
> = {
  BUILD: [
    "inventory-state",
    "world-structure",
    "spatial-authority",
  ],
  MEMORY: [
    "state-flow",
    "persistence-recovery",
  ],
  SEARCH: [
    "state-flow",
    "world-structure",
  ],
  PUZZLE: [
    "state-flow",
    "world-structure",
  ],
  PARKOUR: ["spatial-authority"],
  MELEE_COMBAT: ["combat-lifecycle"],
  RANGED_COMBAT: ["combat-lifecycle"],
  TEAM_COMBAT: [
    "combat-lifecycle",
    "multiplayer-interleaving",
  ],
  BASE_DEFENSE: [
    "combat-lifecycle",
    "state-flow",
  ],
  BASE_ATTACK: [
    "combat-lifecycle",
    "state-flow",
  ],
  CAPTURE_OBJECTIVE: [
    "combat-lifecycle",
    "state-flow",
  ],
  ESCORT: [
    "entity-behavior",
    "state-flow",
  ],
  EXTRACTION: [
    "state-flow",
    "spatial-authority",
  ],
  WAVE_DEFENSE: [
    "combat-lifecycle",
    "entity-behavior",
    "chunk-simulation",
    "state-flow",
  ],
  SURVIVAL_TIMER: [
    "state-flow",
    "temporal-ownership",
  ],
  ENTITY_AI: [
    "entity-behavior",
    "chunk-simulation",
  ],
  RESOURCE_ECONOMY: [
    "economy-reward",
    "inventory-state",
  ],
  SHOP: [
    "economy-reward",
    "inventory-state",
  ],
  LOADOUT: ["inventory-state"],
  CRAFTING: [
    "inventory-state",
    "economy-reward",
  ],
  COLLECTION: [
    "inventory-state",
    "state-flow",
  ],
  RESPAWN: [
    "combat-lifecycle",
    "persistence-recovery",
  ],
  REVIVE: [
    "combat-lifecycle",
    "persistence-recovery",
  ],
  ROUND_TIMER: [
    "state-flow",
    "temporal-ownership",
  ],
  MULTI_ARENA: [
    "arena-lifecycle",
    "multiplayer-interleaving",
  ],
  MULTI_STAGE: ["state-flow"],
  PROGRESSION: ["state-flow"],
  PERSISTENCE: ["persistence-recovery"],
  RECONNECT: ["persistence-recovery"],
  WORLD_RESET: [
    "arena-lifecycle",
    "world-structure",
  ],
};

const EMPTY_SIGNALS: MapClassificationAuditSignals = {
  hasMultiArena: false,
  hasPersistence: false,
  hasDeferredWork: false,
  hasRepeatedRunSurface: false,
  hasTransactionalGameplay: false,
  hasSimulationDistanceDependency: false,
  hasProgressionActorSurface: false,
  hasPlayerFeedbackSurface: false,
};

export function deriveMapClassificationAuditProfile(
  classification:
    | GameDesignMapClassification
    | undefined,
): MapClassificationAuditProfile {
  if (
    classification === undefined ||
    !isResolvedMapClassification(
      classification,
    )
  ) {
    return {
      active: false,
      requiredKnowledgeDomains: [],
      signals: EMPTY_SIGNALS,
    };
  }

  const domains =
    new Set<AnalysisKnowledgeDomain>(
      TYPE_DOMAINS[
        classification.mapType!
      ],
    );

  if (
    classification.playerMode !== "SOLO"
  ) {
    domains.add(
      "multiplayer-interleaving",
    );
  }

  for (
    const mechanic of
      classification.mechanicTags
  ) {
    for (
      const domain of
        MECHANIC_DOMAINS[mechanic] ?? []
    ) {
      domains.add(domain);
    }
  }

  const mechanicTags =
    new Set(
      classification.mechanicTags,
    );

  return {
    active: true,
    requiredKnowledgeDomains:
      [...domains].sort(),
    signals: {
      hasMultiArena:
        mechanicTags.has("MULTI_ARENA"),
      hasPersistence:
        mechanicTags.has("PERSISTENCE") ||
        mechanicTags.has("RECONNECT"),
      hasDeferredWork:
        mechanicTags.has("ROUND_TIMER") ||
        mechanicTags.has("SURVIVAL_TIMER"),
      hasRepeatedRunSurface:
        mechanicTags.has("WORLD_RESET"),
      hasTransactionalGameplay:
        mechanicTags.has("SHOP") ||
        mechanicTags.has("RESOURCE_ECONOMY") ||
        mechanicTags.has("CRAFTING"),
      hasSimulationDistanceDependency:
        mechanicTags.has("ENTITY_AI") ||
        mechanicTags.has("WAVE_DEFENSE"),
      hasProgressionActorSurface:
        mechanicTags.has("WAVE_DEFENSE"),
      hasPlayerFeedbackSurface:
        mechanicTags.has("SHOP") ||
        mechanicTags.has("ROUND_TIMER") ||
        mechanicTags.has("PROGRESSION") ||
        mechanicTags.has("CAPTURE_OBJECTIVE"),
    },
  };
}
