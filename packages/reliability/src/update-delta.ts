import type {
  MinecraftUpdateDelta,
  ReliabilityDomain,
  UpdateDeltaEntry,
} from "./types.js";

export function affectedCapabilityTags(
  delta: MinecraftUpdateDelta,
): string[] {
  return [...new Set(delta.entries.flatMap((entry) => entry.capabilityTags))].sort();
}

export function affectedDomains(
  delta: MinecraftUpdateDelta,
): ReliabilityDomain[] {
  return [...new Set(delta.entries.map((entry) => entry.domain))].sort();
}

export function createUpdateDelta(
  toVersion: string,
  entries: readonly UpdateDeltaEntry[],
  fromVersion?: string,
): MinecraftUpdateDelta {
  return {
    ...(fromVersion ? { fromVersion } : {}),
    toVersion,
    entries: [...entries].sort((a, b) => a.id.localeCompare(b.id)),
  };
}
