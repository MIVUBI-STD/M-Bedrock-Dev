import type {
  GameDesignMapClassification,
  GameDesignMechanicTag,
  GameDesignMapType,
  GameDesignPlayerMode,
} from "./types.js";

export const GAME_DESIGN_MAP_TYPES = [
  "BUILDING",
  "COMBAT",
  "SURVIVAL",
  "STRATEGY",
  "SEARCH_PUZZLE",
  "CHALLENGE_COURSE",
  "SKILL_COURSE",
] as const satisfies readonly GameDesignMapType[];

export const GAME_DESIGN_PLAYER_MODES = [
  "SOLO",
  "COOPERATIVE",
  "COMPETITIVE",
  "TEAM_COMPETITIVE",
  "ASYMMETRIC",
] as const satisfies readonly GameDesignPlayerMode[];

export const GAME_DESIGN_MECHANIC_TAGS = [
  "BUILD",
  "MEMORY",
  "SEARCH",
  "PUZZLE",
  "PARKOUR",
  "MELEE_COMBAT",
  "RANGED_COMBAT",
  "TEAM_COMBAT",
  "BASE_DEFENSE",
  "BASE_ATTACK",
  "CAPTURE_OBJECTIVE",
  "ESCORT",
  "EXTRACTION",
  "WAVE_DEFENSE",
  "SURVIVAL_TIMER",
  "ENTITY_AI",
  "RESOURCE_ECONOMY",
  "SHOP",
  "LOADOUT",
  "CRAFTING",
  "COLLECTION",
  "RESPAWN",
  "REVIVE",
  "ROUND_TIMER",
  "MULTI_ARENA",
  "MULTI_STAGE",
  "PROGRESSION",
  "PERSISTENCE",
  "RECONNECT",
  "WORLD_RESET",
] as const satisfies readonly GameDesignMechanicTag[];

export function isResolvedMapClassification(
  classification: GameDesignMapClassification,
): boolean {
  return (
    classification.classificationStatus === "RESOLVED" &&
    classification.mapType !== null &&
    classification.playerMode !== null
  );
}
