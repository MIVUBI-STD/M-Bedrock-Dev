import { compareVersions } from "../../knowledge/src/version.js";

export interface ScriptApiCapabilityRule {
  id: string;
  moduleName: string;
  minStableVersion?: string;
  track?: "stable" | "beta";
  sourceIds: readonly string[];
}

export const SCRIPT_API_CAPABILITY_RULES: readonly ScriptApiCapabilityRule[] = [
  {
    id: "script.dynamic-properties.world-entity",
    moduleName: "@minecraft/server",
    minStableVersion: "1.7.0",
    track: "stable",
    sourceIds: ["ms-update-1.20.50"],
  },
  {
    id: "script.dynamic-properties.itemstack",
    moduleName: "@minecraft/server",
    minStableVersion: "1.9.0",
    track: "stable",
    sourceIds: ["ms-update-1.20.70"],
  },
  {
    id: "script.system-before-events",
    moduleName: "@minecraft/server",
    minStableVersion: "2.0.0",
    track: "stable",
    sourceIds: ["ms-system-before-events"],
  },
];

export interface ScriptApiCapabilityCheck {
  supported: boolean | "unknown";
  reason: string;
  rule?: ScriptApiCapabilityRule;
}

export function checkScriptApiCapability(
  capabilityId: string,
  moduleName: string,
  moduleVersion: string,
): ScriptApiCapabilityCheck {
  const rule = SCRIPT_API_CAPABILITY_RULES.find(
    (item) => item.id === capabilityId && item.moduleName === moduleName,
  );
  if (!rule) {
    return {
      supported: "unknown",
      reason: "No versioned Script API capability rule is registered.",
    };
  }

  if (!rule.minStableVersion) {
    return {
      supported: "unknown",
      reason: "Capability rule has no stable minimum version.",
      rule,
    };
  }

  const stableLike = /^\d+\.\d+\.\d+$/.test(moduleVersion);
  if (!stableLike) {
    return {
      supported: "unknown",
      reason: "Prerelease or non-semver module versions require track-specific evaluation.",
      rule,
    };
  }

  const supported = compareVersions(moduleVersion, rule.minStableVersion) >= 0;
  return {
    supported,
    reason: supported
      ? `${capabilityId} is available from stable ${rule.minStableVersion}.`
      : `${capabilityId} requires stable ${rule.minStableVersion} or later.`,
    rule,
  };
}
