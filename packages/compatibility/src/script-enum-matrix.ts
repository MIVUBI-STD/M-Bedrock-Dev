import type { ScriptSymbolLifecycle } from "./script-lifecycle.js";

export interface ScriptEnumMemberRule {
  id: string;
  moduleName: "@minecraft/server";
  enumName: string;
  member: string;
  symbol: string;
  lifecycle?: ScriptSymbolLifecycle;
  sourceIds: readonly string[];
}

export const SCRIPT_ENUM_MEMBER_RULES: readonly ScriptEnumMemberRule[] = [
  {
    id: "script-enum-gamemode-adventure",
    moduleName: "@minecraft/server",
    enumName: "GameMode",
    member: "Adventure",
    symbol: "GameMode.Adventure",
    sourceIds: ["ms-server-changelog"],
  },
  {
    id: "script-enum-gamemode-creative",
    moduleName: "@minecraft/server",
    enumName: "GameMode",
    member: "Creative",
    symbol: "GameMode.Creative",
    sourceIds: ["ms-server-changelog"],
  },
  {
    id: "script-enum-gamemode-spectator",
    moduleName: "@minecraft/server",
    enumName: "GameMode",
    member: "Spectator",
    symbol: "GameMode.Spectator",
    sourceIds: ["ms-server-changelog"],
  },
  {
    id: "script-enum-gamemode-survival",
    moduleName: "@minecraft/server",
    enumName: "GameMode",
    member: "Survival",
    symbol: "GameMode.Survival",
    sourceIds: ["ms-server-changelog"],
  },
  {
    id: "script-enum-gamemode-adventure-legacy",
    moduleName: "@minecraft/server",
    enumName: "GameMode",
    member: "adventure",
    symbol: "GameMode.adventure",
    lifecycle: {
      removedIn: "2.0.0",
      replacement: "GameMode.Adventure",
      sourceIds: ["ms-gamemode-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-gamemode-1xx", "ms-server-changelog"],
  },
  {
    id: "script-enum-gamemode-creative-legacy",
    moduleName: "@minecraft/server",
    enumName: "GameMode",
    member: "creative",
    symbol: "GameMode.creative",
    lifecycle: {
      removedIn: "2.0.0",
      replacement: "GameMode.Creative",
      sourceIds: ["ms-gamemode-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-gamemode-1xx", "ms-server-changelog"],
  },
  {
    id: "script-enum-gamemode-spectator-legacy",
    moduleName: "@minecraft/server",
    enumName: "GameMode",
    member: "spectator",
    symbol: "GameMode.spectator",
    lifecycle: {
      removedIn: "2.0.0",
      replacement: "GameMode.Spectator",
      sourceIds: ["ms-gamemode-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-gamemode-1xx", "ms-server-changelog"],
  },
  {
    id: "script-enum-gamemode-survival-legacy",
    moduleName: "@minecraft/server",
    enumName: "GameMode",
    member: "survival",
    symbol: "GameMode.survival",
    lifecycle: {
      removedIn: "2.0.0",
      replacement: "GameMode.Survival",
      sourceIds: ["ms-gamemode-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-gamemode-1xx", "ms-server-changelog"],
  },
  {
    id: "script-enum-entity-damage-cause-suicide-legacy",
    moduleName: "@minecraft/server",
    enumName: "EntityDamageCause",
    member: "suicide",
    symbol: "EntityDamageCause.suicide",
    lifecycle: {
      removedIn: "2.0.0",
      sourceIds: ["ms-server-changelog"],
    },
    sourceIds: ["ms-server-changelog"],
  },
  {
    id: "script-enum-entity-component-types-ground-offset-legacy",
    moduleName: "@minecraft/server",
    enumName: "EntityComponentTypes",
    member: "GroundOffset",
    symbol: "EntityComponentTypes.GroundOffset",
    lifecycle: {
      removedIn: "2.0.0",
      sourceIds: ["ms-entity-component-types-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-entity-component-types-1xx", "ms-server-changelog"],
  },
];

export function findScriptEnumMemberRule(
  symbol: string,
): ScriptEnumMemberRule | undefined {
  return SCRIPT_ENUM_MEMBER_RULES.find((item) => item.symbol === symbol);
}

export function isKnownScriptEnum(enumName: string): boolean {
  return SCRIPT_ENUM_MEMBER_RULES.some((item) => item.enumName === enumName);
}
