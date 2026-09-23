import { compareVersions } from "../../knowledge/src/version.js";
import type { ScriptApiTrack } from "./script-api.js";

export type ScriptMethodStability = "stable" | "pre-release";

export interface ScriptMethodSymbolRule {
  id: string;
  moduleName: "@minecraft/server";
  symbol: string;
  stability: ScriptMethodStability;
  introducedIn?: string;
  sourceIds: readonly string[];
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
