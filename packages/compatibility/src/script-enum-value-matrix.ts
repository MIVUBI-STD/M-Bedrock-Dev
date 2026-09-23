import { compareVersions } from "../../knowledge/src/version.js";
import type { ScriptApiTrack } from "./script-api.js";

export interface ScriptEnumValueTransitionRule {
  id: string;
  moduleName: "@minecraft/server";
  symbol: string;
  transitionIn: string;
  beforeValue: string;
  afterValue: string;
  sourceIds: readonly string[];
}

export const SCRIPT_ENUM_VALUE_RULES: readonly ScriptEnumValueTransitionRule[] = [
  {
    id: "script-enum-value.block-component-types-fluid-container-2.0",
    moduleName: "@minecraft/server",
    symbol: "BlockComponentTypes.FluidContainer",
    transitionIn: "2.0.0",
    beforeValue: "minecraft:fluidContainer",
    afterValue: "minecraft:fluid_container",
    sourceIds: ["ms-server-changelog"],
  },
];

export interface ScriptEnumValueCheck {
  compatible: boolean | "unknown";
  expectedValue?: string;
  rule?: ScriptEnumValueTransitionRule;
  reason: string;
}

export function findScriptEnumValueRule(
  symbol: string,
): ScriptEnumValueTransitionRule | undefined {
  return SCRIPT_ENUM_VALUE_RULES.find((item) => item.symbol === symbol);
}

export function checkScriptEnumLiteralComparison(
  symbol: string,
  literal: string,
  moduleVersion: string,
  moduleTrack: ScriptApiTrack,
): ScriptEnumValueCheck {
  const rule = findScriptEnumValueRule(symbol);
  if (!rule) return { compatible: "unknown", reason: "No enum backing-value transition rule is registered." };
  if (moduleTrack === "unknown") {
    return { compatible: "unknown", rule, reason: "The manifest Script API track cannot be classified." };
  }

  const after = compareVersions(moduleVersion, rule.transitionIn) >= 0;
  const expectedValue = after ? rule.afterValue : rule.beforeValue;
  if (literal === expectedValue) {
    return { compatible: true, expectedValue, rule, reason: "The compared literal matches this module line." };
  }
  if (literal === rule.beforeValue || literal === rule.afterValue) {
    return {
      compatible: false,
      expectedValue,
      rule,
      reason: `${symbol} is compared against a backing value from the other API line.`,
    };
  }
  return {
    compatible: "unknown",
    expectedValue,
    rule,
    reason: "The comparison uses an unrelated literal; no conclusion is made.",
  };
}
