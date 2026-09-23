import { compareVersions } from "../../knowledge/src/version.js";
import type { ScriptApiTrack } from "./script-api.js";
import type { ScriptSymbolLifecycle } from "./script-lifecycle.js";

export type ScriptMethodStability = "stable" | "pre-release";

export interface ScriptMethodSymbolRule {
  id: string;
  moduleName: "@minecraft/server";
  symbol: string;
  stability: ScriptMethodStability;
  introducedIn?: string;
  lifecycle?: ScriptSymbolLifecycle;
  sourceIds: readonly string[];
}

function currentStableMethod(
  id: string,
  symbol: string,
  sourceIds: readonly string[],
): ScriptMethodSymbolRule {
  return {
    id,
    moduleName: "@minecraft/server",
    symbol,
    stability: "stable",
    sourceIds,
  };
}

export const SCRIPT_METHOD_SYMBOL_RULES: readonly ScriptMethodSymbolRule[] = [
  {
    id: "script-method.world.get-all-players",
    moduleName: "@minecraft/server",
    symbol: "world.getAllPlayers",
    stability: "stable",
    introducedIn: "1.0.0",
    sourceIds: ["ms-update-1.19.50"],
  },
  {
    id: "script-method.world.get-dimension",
    moduleName: "@minecraft/server",
    symbol: "world.getDimension",
    stability: "stable",
    introducedIn: "1.0.0",
    sourceIds: ["ms-update-1.19.50"],
  },
  {
    id: "script-method.system.run-interval",
    moduleName: "@minecraft/server",
    symbol: "system.runInterval",
    stability: "stable",
    introducedIn: "1.1.0",
    sourceIds: ["ms-update-1.19.80", "ms-server-changelog"],
  },
  {
    id: "script-method.dimension.get-entities",
    moduleName: "@minecraft/server",
    symbol: "Dimension.getEntities",
    stability: "stable",
    introducedIn: "1.1.0",
    sourceIds: ["ms-server-changelog"],
  },
  {
    id: "script-method.entity.add-tag",
    moduleName: "@minecraft/server",
    symbol: "Entity.addTag",
    stability: "stable",
    introducedIn: "1.2.0",
    sourceIds: ["ms-server-changelog"],
  },
  {
    id: "script-method.entity.get-tags",
    moduleName: "@minecraft/server",
    symbol: "Entity.getTags",
    stability: "stable",
    introducedIn: "1.2.0",
    sourceIds: ["ms-server-changelog"],
  },
  {
    id: "script-method.entity.remove-tag",
    moduleName: "@minecraft/server",
    symbol: "Entity.removeTag",
    stability: "stable",
    introducedIn: "1.2.0",
    sourceIds: ["ms-server-changelog"],
  },
  {
    id: "script-method.world.play-sound-legacy",
    moduleName: "@minecraft/server",
    symbol: "world.playSound",
    stability: "stable",
    lifecycle: {
      deprecatedInMajor: 1,
      removedIn: "2.0.0",
      replacement: "Dimension.playSound",
      sourceIds: ["ms-world-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-world-1xx", "ms-server-changelog"],
  },
  {
    id: "script-method.dimension.run-command-async-legacy",
    moduleName: "@minecraft/server",
    symbol: "Dimension.runCommandAsync",
    stability: "stable",
    lifecycle: {
      deprecatedInMajor: 1,
      removedIn: "2.0.0",
      sourceIds: ["ms-dimension-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-dimension-1xx", "ms-server-changelog"],
  },
  {
    id: "script-method.entity.run-command-async-legacy",
    moduleName: "@minecraft/server",
    symbol: "Entity.runCommandAsync",
    stability: "stable",
    lifecycle: {
      deprecatedInMajor: 1,
      removedIn: "2.0.0",
      sourceIds: ["ms-entity-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-entity-1xx", "ms-server-changelog"],
  },
  {
    id: "script-method.entity.is-valid-legacy",
    moduleName: "@minecraft/server",
    symbol: "Entity.isValid",
    stability: "stable",
    lifecycle: {
      deprecatedInMajor: 1,
      removedIn: "2.0.0",
      replacement: "Entity.isValid (property)",
      sourceIds: ["ms-entity-1xx", "ms-server-changelog"],
    },
    sourceIds: ["ms-entity-1xx", "ms-server-changelog"],
  },
  {
    id: "script-method.scoreboard-objective.is-valid-legacy",
    moduleName: "@minecraft/server",
    symbol: "ScoreboardObjective.isValid",
    stability: "stable",
    lifecycle: {
      deprecatedInMajor: 1,
      removedIn: "2.0.0",
      replacement: "ScoreboardObjective.isValid (property)",
      sourceIds: ["ms-server-changelog"],
    },
    sourceIds: ["ms-server-changelog"],
  },

  // Usage-driven current-stable rules promoted from the production portfolio.
  // No introducedIn value is assigned unless historical provenance is explicit.
  currentStableMethod("script-method.system.run-timeout-current", "system.runTimeout", ["ms-system-current"]),
  currentStableMethod("script-method.system.clear-run-current", "system.clearRun", ["ms-system-current"]),
  currentStableMethod("script-method.scoreboard.get-objective-current", "Scoreboard.getObjective", ["ms-scoreboard-current"]),
  currentStableMethod("script-method.scoreboard.add-objective-current", "Scoreboard.addObjective", ["ms-scoreboard-current"]),
  currentStableMethod("script-method.scoreboard.get-objectives-current", "Scoreboard.getObjectives", ["ms-scoreboard-current"]),
  currentStableMethod("script-method.scoreboard-objective.get-score-current", "ScoreboardObjective.getScore", ["ms-scoreboard-objective-current"]),
  currentStableMethod("script-method.scoreboard-objective.get-scores-current", "ScoreboardObjective.getScores", ["ms-scoreboard-objective-current"]),
  currentStableMethod("script-method.scoreboard-objective.get-participants-current", "ScoreboardObjective.getParticipants", ["ms-scoreboard-objective-current"]),
  currentStableMethod("script-method.scoreboard-objective.set-score-current", "ScoreboardObjective.setScore", ["ms-scoreboard-objective-current"]),
  currentStableMethod("script-method.world.get-dynamic-property-current", "world.getDynamicProperty", ["ms-world-current"]),
  currentStableMethod("script-method.world.get-dynamic-property-ids-current", "world.getDynamicPropertyIds", ["ms-world-current"]),
  currentStableMethod("script-method.world.set-dynamic-property-current", "world.setDynamicProperty", ["ms-world-current"]),
  currentStableMethod("script-method.world.get-players-current", "world.getPlayers", ["ms-world-current"]),
  currentStableMethod("script-method.world.send-message-current", "world.sendMessage", ["ms-world-current"]),
  currentStableMethod("script-method.dimension.run-command-current", "Dimension.runCommand", ["ms-dimension-current"]),
  currentStableMethod("script-method.dimension.get-players-current", "Dimension.getPlayers", ["ms-dimension-current"]),
  currentStableMethod("script-method.dimension.spawn-item-current", "Dimension.spawnItem", ["ms-dimension-current"]),
  currentStableMethod("script-method.entity.has-tag-current", "Entity.hasTag", ["ms-entity-current"]),
  currentStableMethod("script-method.entity.remove-current", "Entity.remove", ["ms-entity-current"]),
  currentStableMethod("script-method.entity.get-property-current", "Entity.getProperty", ["ms-entity-current"]),
  currentStableMethod("script-method.entity.teleport-current", "Entity.teleport", ["ms-entity-current"]),
  currentStableMethod("script-method.player.send-message-current", "Player.sendMessage", ["ms-player-current"]),
];

export interface ScriptMethodSymbolCheck {
  supported: boolean | "unknown";
  reason: string;
  rule?: ScriptMethodSymbolRule;
}

export function findScriptMethodRule(
  symbol: string,
): ScriptMethodSymbolRule | undefined {
  return SCRIPT_METHOD_SYMBOL_RULES.find((item) => item.symbol === symbol);
}

export function checkScriptMethodSymbol(
  symbol: string,
  moduleVersion: string,
  moduleTrack: ScriptApiTrack,
): ScriptMethodSymbolCheck {
  const rule = findScriptMethodRule(symbol);
  if (!rule) {
    return {
      supported: "unknown",
      reason: "No evidence-backed method symbol rule is registered.",
    };
  }

  if (rule.stability === "pre-release") {
    if (moduleTrack === "beta" || moduleTrack === "internal") {
      return {
        supported: true,
        reason: `${symbol} is a pre-release symbol and the manifest uses a pre-release track.`,
        rule,
      };
    }
    if (moduleTrack === "stable") {
      return {
        supported: false,
        reason: `${symbol} is documented as pre-release but the manifest uses the stable track.`,
        rule,
      };
    }
    return {
      supported: "unknown",
      reason: "The manifest Script API track cannot be classified.",
      rule,
    };
  }

  if (!rule.introducedIn) {
    return {
      supported: "unknown",
      reason: "The stable method rule has no documented introduction version.",
      rule,
    };
  }

  if (moduleTrack !== "stable" || !/^\d+\.\d+\.\d+$/.test(moduleVersion)) {
    return {
      supported: "unknown",
      reason: "Stable method minima are only compared against stable semantic versions.",
      rule,
    };
  }

  const supported = compareVersions(moduleVersion, rule.introducedIn) >= 0;
  return {
    supported,
    reason: supported
      ? `${symbol} is available from stable ${rule.introducedIn}.`
      : `${symbol} requires stable ${rule.introducedIn} or later.`,
    rule,
  };
}
