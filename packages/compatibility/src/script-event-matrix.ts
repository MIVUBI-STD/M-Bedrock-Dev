import type { ScriptSymbolLifecycle } from "./script-lifecycle.js";

export type ScriptEventStability = "stable" | "pre-release";

export interface ScriptEventSymbolRule {
  id: string;
  moduleName: "@minecraft/server";
  symbol: string;
  stability: ScriptEventStability;
  introducedIn?: string;
  lifecycle?: ScriptSymbolLifecycle;
  sourceIds: readonly string[];
}

function currentStableEvent(
  id: string,
  symbol: string,
): ScriptEventSymbolRule {
  return {
    id,
    moduleName: "@minecraft/server",
    symbol,
    stability: "stable",
    sourceIds: ["ms-world-after-events-current"],
  };
}

export const SCRIPT_EVENT_SYMBOL_RULES: readonly ScriptEventSymbolRule[] = [
  {
    id: "script-event.world.before.player-break-block",
    moduleName: "@minecraft/server",
    symbol: "world.beforeEvents.playerBreakBlock",
    stability: "stable",
    sourceIds: ["ms-world-before-events"],
  },
  {
    id: "script-event.system.after.script-event-receive",
    moduleName: "@minecraft/server",
    symbol: "system.afterEvents.scriptEventReceive",
    stability: "stable",
    sourceIds: ["ms-system-after-events", "ms-system-after-events-1xx"],
  },
  {
    id: "script-event.system.before.startup",
    moduleName: "@minecraft/server",
    symbol: "system.beforeEvents.startup",
    stability: "stable",
    sourceIds: ["ms-system-before-events"],
  },
  {
    id: "script-event.system.before.shutdown",
    moduleName: "@minecraft/server",
    symbol: "system.beforeEvents.shutdown",
    stability: "stable",
    sourceIds: ["ms-system-before-events"],
  },
  {
    id: "script-event.world.before.chat-send-beta",
    moduleName: "@minecraft/server",
    symbol: "world.beforeEvents.chatSend",
    stability: "pre-release",
    introducedIn: "2.12.0-beta.1.26.60-preview.23",
    sourceIds: ["ms-server-changelog", "ms-world-before-events"],
  },
  {
    id: "script-event.world.before.player-place-block-beta",
    moduleName: "@minecraft/server",
    symbol: "world.beforeEvents.playerPlaceBlock",
    stability: "pre-release",
    introducedIn: "2.12.0-beta.1.26.60-preview.23",
    sourceIds: ["ms-server-changelog", "ms-world-before-events"],
  },
  {
    id: "script-event.world.before.world-clock-restart-beta",
    moduleName: "@minecraft/server",
    symbol: "world.beforeEvents.worldClockOnRestart",
    stability: "pre-release",
    introducedIn: "2.12.0-beta.1.26.60-preview.23",
    sourceIds: ["ms-server-changelog", "ms-world-before-events"],
  },
  {
    id: "script-event.system.before.watchdog-terminate-beta",
    moduleName: "@minecraft/server",
    symbol: "system.beforeEvents.watchdogTerminate",
    stability: "pre-release",
    introducedIn: "2.12.0-beta.1.26.60-preview.23",
    sourceIds: ["ms-server-changelog", "ms-system-before-events"],
  },
  {
    id: "script-event.world-before-world-initialize-legacy",
    moduleName: "@minecraft/server",
    symbol: "world.beforeEvents.worldInitialize",
    stability: "stable",
    lifecycle: {
      deprecatedInMajor: 1,
      removedIn: "2.0.0",
      sourceIds: ["ms-world-before-events-1xx", "ms-item-use-on-before-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-world-before-events-1xx", "ms-server-changelog"],
  },
  {
    id: "script-event.world-after-world-initialize-legacy",
    moduleName: "@minecraft/server",
    symbol: "world.afterEvents.worldInitialize",
    stability: "stable",
    lifecycle: {
      deprecatedInMajor: 1,
      removedIn: "2.0.0",
      sourceIds: ["ms-world-after-events-1xx", "ms-item-use-on-after-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-world-after-events-1xx", "ms-server-changelog"],
  },
  {
    id: "script-event.world-before-item-use-on-legacy",
    moduleName: "@minecraft/server",
    symbol: "world.beforeEvents.itemUseOn",
    stability: "stable",
    lifecycle: {
      deprecatedInMajor: 1,
      removedIn: "2.0.0",
      replacement: "world.beforeEvents.playerInteractWithBlock",
      sourceIds: ["ms-world-before-events-1xx", "ms-item-use-on-before-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-world-before-events-1xx", "ms-server-changelog"],
  },
  {
    id: "script-event.world-after-item-use-on-legacy",
    moduleName: "@minecraft/server",
    symbol: "world.afterEvents.itemUseOn",
    stability: "stable",
    lifecycle: {
      deprecatedInMajor: 1,
      removedIn: "2.0.0",
      replacement: "world.afterEvents.playerInteractWithBlock",
      sourceIds: ["ms-world-after-events-1xx", "ms-item-use-on-after-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-world-after-events-1xx", "ms-server-changelog"],
  },
  {
    id: "script-event.world-after-entity-hurt-legacy",
    moduleName: "@minecraft/server",
    symbol: "world.afterEvents.entityHurt",
    stability: "stable",
    lifecycle: {
      deprecatedInMajor: 1,
      removedIn: "2.0.0",
      sourceIds: ["ms-world-after-events-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-world-after-events-1xx", "ms-server-changelog"],
  },

  // Current-stable events observed in both production Defense maps.
  currentStableEvent("script-event.world-after.data-driven-entity-trigger-current", "world.afterEvents.dataDrivenEntityTrigger"),
  currentStableEvent("script-event.world-after.entity-die-current", "world.afterEvents.entityDie"),
  currentStableEvent("script-event.world-after.entity-spawn-current", "world.afterEvents.entitySpawn"),
  currentStableEvent("script-event.world-after.item-start-use-current", "world.afterEvents.itemStartUse"),
  currentStableEvent("script-event.world-after.player-dimension-change-current", "world.afterEvents.playerDimensionChange"),
  currentStableEvent("script-event.world-after.player-game-mode-change-current", "world.afterEvents.playerGameModeChange"),
  currentStableEvent("script-event.world-after.player-interact-with-block-current", "world.afterEvents.playerInteractWithBlock"),
  currentStableEvent("script-event.world-after.player-join-current", "world.afterEvents.playerJoin"),
  currentStableEvent("script-event.world-after.player-leave-current", "world.afterEvents.playerLeave"),
  currentStableEvent("script-event.world-after.player-place-block-current", "world.afterEvents.playerPlaceBlock"),
  currentStableEvent("script-event.world-after.player-spawn-current", "world.afterEvents.playerSpawn"),
  currentStableEvent("script-event.world-after.world-load-current", "world.afterEvents.worldLoad"),
];

export function scriptEventSymbol(
  root: string,
  phase: string,
  event: string,
): string {
  return `${root}.${phase}.${event}`;
}

export function findScriptEventRule(
  symbol: string,
): ScriptEventSymbolRule | undefined {
  return SCRIPT_EVENT_SYMBOL_RULES.find((item) => item.symbol === symbol);
}
