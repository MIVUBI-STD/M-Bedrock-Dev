import { compareVersions } from "../../knowledge/src/index.js";
import type { ScriptApiTrack } from "./script-api.js";

export interface ScriptPropertyMutabilityRule {
  id: string;
  moduleName: "@minecraft/server";
  symbol: string;
  transitionIn: string;
  before: "writable";
  after: "readonly";
  sourceIds: readonly string[];
}

export const SCRIPT_PROPERTY_MUTABILITY_RULES: readonly ScriptPropertyMutabilityRule[] = [
  {
    id: "script-property-mutability.friction-value-2.0",
    moduleName: "@minecraft/server",
    symbol: "EntityFrictionModifierComponent.value",
    transitionIn: "2.0.0",
    before: "writable",
    after: "readonly",
    sourceIds: ["ms-server-changelog", "ms-entity-friction-1xx"],
  },
  {
    id: "script-property-mutability.mark-variant-value-2.0",
    moduleName: "@minecraft/server",
    symbol: "EntityMarkVariantComponent.value",
    transitionIn: "2.0.0",
    before: "writable",
    after: "readonly",
    sourceIds: ["ms-server-changelog", "ms-entity-mark-variant-1xx"],
  },
  {
    id: "script-property-mutability.push-through-value-2.0",
    moduleName: "@minecraft/server",
    symbol: "EntityPushThroughComponent.value",
    transitionIn: "2.0.0",
    before: "writable",
    after: "readonly",
    sourceIds: ["ms-server-changelog", "ms-entity-push-through-1xx"],
  },
  {
    id: "script-property-mutability.scale-value-2.0",
    moduleName: "@minecraft/server",
    symbol: "EntityScaleComponent.value",
    transitionIn: "2.0.0",
    before: "writable",
    after: "readonly",
    sourceIds: ["ms-server-changelog", "ms-entity-scale-1xx"],
  },
  {
    id: "script-property-mutability.skin-id-value-2.0",
    moduleName: "@minecraft/server",
    symbol: "EntitySkinIdComponent.value",
    transitionIn: "2.0.0",
    before: "writable",
    after: "readonly",
    sourceIds: ["ms-server-changelog", "ms-entity-skin-id-1xx"],
  },
];

export interface ScriptPropertyMutabilityCheck {
  compatible: boolean | "unknown";
  rule?: ScriptPropertyMutabilityRule;
  reason: string;
}

export function findScriptPropertyMutabilityRule(
  symbol: string,
): ScriptPropertyMutabilityRule | undefined {
  return SCRIPT_PROPERTY_MUTABILITY_RULES.find((item) => item.symbol === symbol);
}

export function checkScriptPropertyWrite(
  symbol: string,
  moduleVersion: string,
  moduleTrack: ScriptApiTrack,
): ScriptPropertyMutabilityCheck {
  const rule = findScriptPropertyMutabilityRule(symbol);
  if (!rule) {
    return {
      compatible: "unknown",
      reason: "No mutability transition rule is registered.",
    };
  }
  if (moduleTrack === "unknown") {
    return {
      compatible: "unknown",
      rule,
      reason: "The manifest Script API track cannot be classified.",
    };
  }

  const readonly = compareVersions(moduleVersion, rule.transitionIn) >= 0;
  return {
    compatible: !readonly,
    rule,
    reason: readonly
      ? `${symbol} is read-only from @minecraft/server ${rule.transitionIn}.`
      : `${symbol} is writable before @minecraft/server ${rule.transitionIn}.`,
  };
}
