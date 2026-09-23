export type ScriptEventStability = "stable" | "pre-release";

export interface ScriptEventSymbolRule {
  id: string;
  moduleName: "@minecraft/server";
  symbol: string;
  stability: ScriptEventStability;
  introducedIn?: string;
  sourceIds: readonly string[];
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
