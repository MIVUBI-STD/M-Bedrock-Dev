import { compareVersions } from "../../knowledge/src/version.js";
import type { ScriptApiTrack } from "./script-api.js";

export interface ScriptSymbolLifecycle {
  deprecatedInMajor?: number;
  removedIn: string;
  replacement?: string;
  sourceIds: readonly string[];
}

export type ScriptSymbolLifecycleState =
  | "active"
  | "deprecated"
  | "removed"
  | "unknown";

export interface ScriptSymbolLifecycleCheck {
  state: ScriptSymbolLifecycleState;
  reason: string;
}

function majorVersion(version: string): number | undefined {
  const match = version.trim().match(/^(\d+)/);
  if (!match?.[1]) return undefined;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function evaluateScriptSymbolLifecycle(
  lifecycle: ScriptSymbolLifecycle,
  moduleVersion: string,
  moduleTrack: ScriptApiTrack,
): ScriptSymbolLifecycleCheck {
  if (moduleTrack === "unknown") {
    return {
      state: "unknown",
      reason: "The manifest Script API track cannot be classified.",
    };
  }

  const major = majorVersion(moduleVersion);
  if (major === undefined) {
    return {
      state: "unknown",
      reason: "The manifest Script API major version cannot be parsed.",
    };
  }

  if (compareVersions(moduleVersion, lifecycle.removedIn) >= 0) {
    return {
      state: "removed",
      reason: "The symbol was removed in @minecraft/server " + lifecycle.removedIn + ".",
    };
  }

  if (
    lifecycle.deprecatedInMajor !== undefined &&
    major === lifecycle.deprecatedInMajor
  ) {
    return {
      state: "deprecated",
      reason:
        "The prior " + lifecycle.deprecatedInMajor +
        ".x documentation marks this symbol deprecated and scheduled for removal in " +
        lifecycle.removedIn + ".",
    };
  }

  return {
    state: "active",
    reason: "No registered lifecycle transition applies to this module version.",
  };
}
