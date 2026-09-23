import type { ScriptSymbolLifecycle } from "./script-lifecycle.js";

export interface ScriptTypeSymbolRule {
  id: string;
  moduleName: "@minecraft/server";
  symbol: string;
  lifecycle: ScriptSymbolLifecycle;
  sourceIds: readonly string[];
}

function deprecatedRemoved(
  id: string,
  symbol: string,
  sourceIds: readonly string[],
  replacement?: string,
): ScriptTypeSymbolRule {
  return {
    id,
    moduleName: "@minecraft/server",
    symbol,
    lifecycle: {
      deprecatedInMajor: 1,
      removedIn: "2.0.0",
      ...(replacement ? { replacement } : {}),
      sourceIds,
    },
    sourceIds,
  };
}

function removed(
  id: string,
  symbol: string,
  sourceIds: readonly string[],
): ScriptTypeSymbolRule {
  return {
    id,
    moduleName: "@minecraft/server",
    symbol,
    lifecycle: {
      removedIn: "2.0.0",
      sourceIds,
    },
    sourceIds,
  };
}

export const SCRIPT_TYPE_SYMBOL_RULES: readonly ScriptTypeSymbolRule[] = [
  deprecatedRemoved(
    "script-type.camera-default-options",
    "CameraDefaultOptions",
    ["ms-camera-default-options-1xx", "ms-server-changelog"],
    "Camera.setDefaultCamera",
  ),
  deprecatedRemoved(
    "script-type.camera-ease-options",
    "CameraEaseOptions",
    ["ms-camera-ease-options-1xx", "ms-server-changelog"],
    "EaseOptions",
  ),
  deprecatedRemoved("script-type.world-init-before-event", "WorldInitializeBeforeEvent", ["ms-world-init-before-1xx", "ms-server-changelog"], "StartupEvent"),
  deprecatedRemoved("script-type.world-init-after-event", "WorldInitializeAfterEvent", ["ms-world-init-after-1xx", "ms-server-changelog"], "WorldLoadAfterEvent"),
  deprecatedRemoved("script-type.world-init-before-signal", "WorldInitializeBeforeEventSignal", ["ms-world-init-before-signal-1xx", "ms-server-changelog"], "StartupBeforeEventSignal"),
  deprecatedRemoved("script-type.world-init-after-signal", "WorldInitializeAfterEventSignal", ["ms-world-init-after-signal-1xx", "ms-server-changelog"], "WorldLoadAfterEventSignal"),
  deprecatedRemoved("script-type.item-use-on-before-event", "ItemUseOnBeforeEvent", ["ms-item-use-on-before-1xx", "ms-server-changelog"], "PlayerInteractWithBlockBeforeEvent"),
  deprecatedRemoved("script-type.item-use-on-after-event", "ItemUseOnAfterEvent", ["ms-item-use-on-after-1xx", "ms-server-changelog"], "PlayerInteractWithBlockAfterEvent"),
  deprecatedRemoved("script-type.item-use-on-before-signal", "ItemUseOnBeforeEventSignal", ["ms-item-use-on-before-signal-1xx", "ms-server-changelog"]),
  deprecatedRemoved("script-type.item-use-on-after-signal", "ItemUseOnAfterEventSignal", ["ms-item-use-on-after-signal-1xx", "ms-server-changelog"]),
  removed("script-type.block-component-player-destroy-event", "BlockComponentPlayerDestroyEvent", ["ms-server-changelog"]),
  removed("script-type.entity-ground-offset-component", "EntityGroundOffsetComponent", ["ms-server-changelog"]),
  {
    id: "script-type.entity-hurt-after-signal",
    moduleName: "@minecraft/server",
    symbol: "EntityHurtAfterEventSignal",
    lifecycle: {
      removedIn: "2.0.0",
      reintroducedIn: "2.6.0",
      sourceIds: ["ms-server-changelog"],
    },
    sourceIds: ["ms-server-changelog"],
  },
  removed("script-type.ibutton-push-after-signal", "IButtonPushAfterEventSignal", ["ms-server-changelog"]),
  removed("script-type.ilever-action-after-signal", "ILeverActionAfterEventSignal", ["ms-server-changelog"]),
  removed("script-type.iplayer-join-after-signal", "IPlayerJoinAfterEventSignal", ["ms-server-changelog"]),
  removed("script-type.iplayer-leave-after-signal", "IPlayerLeaveAfterEventSignal", ["ms-server-changelog"]),
  removed("script-type.iplayer-spawn-after-signal", "IPlayerSpawnAfterEventSignal", ["ms-server-changelog"]),
  removed("script-type.minecraft-dimension-types", "MinecraftDimensionTypes", ["ms-server-changelog"]),
];

export function findScriptTypeRule(
  symbol: string,
): ScriptTypeSymbolRule | undefined {
  return SCRIPT_TYPE_SYMBOL_RULES.find((item) => item.symbol === symbol);
}
