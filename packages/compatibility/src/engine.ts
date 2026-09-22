import { compareGameVersion } from "./version.js";
import type {
  CapabilityQuery,
  CapabilityResult,
  CapabilityRule,
} from "./types.js";

function inRange(
  version: CapabilityQuery["gameVersion"],
  rule: CapabilityRule,
): boolean | "unknown" {
  if (!rule.gameVersions) return true;
  if (!version) return "unknown";

  if (rule.gameVersions.min && compareGameVersion(version, rule.gameVersions.min) < 0) {
    return false;
  }

  if (
    rule.gameVersions.maxExclusive &&
    compareGameVersion(version, rule.gameVersions.maxExclusive) >= 0
  ) {
    return false;
  }

  return true;
}

export function evaluateCapability(
  rules: readonly CapabilityRule[],
  query: CapabilityQuery,
): CapabilityResult {
  if (rules.length === 0) {
    return { supported: "unknown", track: "unknown", reason: "No capability rule is registered." };
  }

  for (const rule of rules) {
    if (!rule.editions.includes(query.edition)) continue;

    const range = inRange(query.gameVersion, rule);
    if (range === false) continue;
    if (range === "unknown") {
      return {
        supported: "unknown",
        track: rule.track,
        ruleId: rule.id,
        reason: "A matching rule exists, but target game version is unknown.",
      };
    }

    if (rule.requiresExperiment) {
      const experiments = new Set(query.experiments ?? []);
      if (!experiments.has(rule.requiresExperiment)) {
        return {
          supported: false,
          track: rule.track,
          ruleId: rule.id,
          reason: `Capability requires experiment: ${rule.requiresExperiment}`,
        };
      }
    }

    return {
      supported: true,
      track: rule.track,
      ruleId: rule.id,
      reason: rule.note ?? "Capability is supported by the matching rule.",
    };
  }

  return {
    supported: false,
    track: "unknown",
    reason: "No matching edition/version capability rule applies.",
  };
}
