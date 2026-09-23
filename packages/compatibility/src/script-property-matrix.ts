import type { ScriptSymbolLifecycle } from "./script-lifecycle.js";

export interface ScriptPropertySymbolRule {
  id: string;
  moduleName: "@minecraft/server";
  symbol: string;
  lifecycle?: ScriptSymbolLifecycle;
  sourceIds: readonly string[];
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
];

export function findScriptPropertyRule(
  symbol: string,
): ScriptPropertySymbolRule | undefined {
  return SCRIPT_PROPERTY_SYMBOL_RULES.find((item) => item.symbol === symbol);
}
