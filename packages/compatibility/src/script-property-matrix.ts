import type { ScriptSymbolLifecycle } from "./script-lifecycle.js";

export interface ScriptPropertySymbolRule {
  id: string;
  moduleName: "@minecraft/server";
  symbol: string;
  lifecycle?: ScriptSymbolLifecycle;
  sourceIds: readonly string[];
}

function currentProperty(
  id: string,
  symbol: string,
  sourceIds: readonly string[],
): ScriptPropertySymbolRule {
  return {
    id,
    moduleName: "@minecraft/server",
    symbol,
    sourceIds,
  };
}

export const SCRIPT_PROPERTY_SYMBOL_RULES: readonly ScriptPropertySymbolRule[] = [
  {
    id: "script-property.world-scoreboard",
    moduleName: "@minecraft/server",
    symbol: "world.scoreboard",
    sourceIds: ["ms-world-current"],
  },
  {
    id: "script-property.player-input-permissions",
    moduleName: "@minecraft/server",
    symbol: "Player.inputPermissions",
    sourceIds: ["ms-player-current"],
  },
  {
    id: "script-property.player-input-camera-enabled-legacy",
    moduleName: "@minecraft/server",
    symbol: "PlayerInputPermissions.cameraEnabled",
    lifecycle: {
      deprecatedInMajor: 1,
      removedIn: "2.0.0",
      replacement: "PlayerInputPermissions.isPermissionCategoryEnabled/setPermissionCategory",
      sourceIds: ["ms-player-input-permissions-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-player-input-permissions-1xx", "ms-server-changelog"],
  },
  {
    id: "script-property.player-input-movement-enabled-legacy",
    moduleName: "@minecraft/server",
    symbol: "PlayerInputPermissions.movementEnabled",
    lifecycle: {
      deprecatedInMajor: 1,
      removedIn: "2.0.0",
      replacement: "PlayerInputPermissions.isPermissionCategoryEnabled/setPermissionCategory",
      sourceIds: ["ms-player-input-permissions-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-player-input-permissions-1xx", "ms-server-changelog"],
  },

  // Usage-driven current properties from the production portfolio.
  currentProperty("script-property.system.current-tick-current", "system.currentTick", ["ms-system-current"]),
  currentProperty("script-property.entity.id-current", "Entity.id", ["ms-entity-current"]),
  currentProperty("script-property.entity.location-current", "Entity.location", ["ms-entity-current"]),
  currentProperty("script-property.entity.dimension-current", "Entity.dimension", ["ms-entity-current"]),
  currentProperty("script-property.entity.type-id-current", "Entity.typeId", ["ms-entity-current"]),
  currentProperty("script-property.entity.name-tag-current", "Entity.nameTag", ["ms-entity-current"]),
  currentProperty("script-property.entity.scoreboard-identity-current", "Entity.scoreboardIdentity", ["ms-entity-current"]),
  currentProperty("script-property.entity.is-valid-current", "Entity.isValid", ["ms-entity-current"]),
  currentProperty("script-property.player.name-current", "Player.name", ["ms-player-current"]),
  currentProperty("script-property.scoreboard-objective.display-name-current", "ScoreboardObjective.displayName", ["ms-scoreboard-objective-current"]),
];

export function findScriptPropertyRule(
  symbol: string,
): ScriptPropertySymbolRule | undefined {
  return SCRIPT_PROPERTY_SYMBOL_RULES.find((item) => item.symbol === symbol);
}
