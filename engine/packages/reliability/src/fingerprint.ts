import { createHash } from "node:crypto";
import type {
  MapCompatibilityFingerprint,
  ReliabilityDomain,
} from "./types.js";

export interface MapFingerprintFacts {
  mapId: string;
  artifactFingerprint?: string;
  minEngineVersions?: readonly string[];
  editions?: readonly string[];
  experiments?: readonly string[];
  commandVerbs?: readonly string[];
  scriptModules?: readonly string[];
  capabilityTags?: readonly string[];
  domains?: readonly ReliabilityDomain[];
  structureCount?: number;
  parsedStructureCount?: number;
  worldDatabasePresent?: boolean;
  riskSurfaces?: readonly string[];
}

function uniqueSorted(values: readonly string[] = []): string[] {
  return [...new Set(values)].sort();
}

function uniqueDomains(values: readonly ReliabilityDomain[] = []): ReliabilityDomain[] {
  return [...new Set(values)].sort();
}

export function createMapCompatibilityFingerprint(
  facts: MapFingerprintFacts,
): MapCompatibilityFingerprint {
  return {
    schemaVersion: 1,
    mapId: facts.mapId,
    ...(facts.artifactFingerprint ? { artifactFingerprint: facts.artifactFingerprint } : {}),
    minEngineVersions: uniqueSorted(facts.minEngineVersions),
    editions: uniqueSorted(facts.editions),
    experiments: uniqueSorted(facts.experiments),
    commandVerbs: uniqueSorted(facts.commandVerbs),
    scriptModules: uniqueSorted(facts.scriptModules),
    capabilityTags: uniqueSorted(facts.capabilityTags),
    domains: uniqueDomains(facts.domains),
    structures: {
      count: facts.structureCount ?? 0,
      parsed: facts.parsedStructureCount ?? 0,
    },
    worldDatabasePresent: facts.worldDatabasePresent ?? false,
    riskSurfaces: uniqueSorted(facts.riskSurfaces),
  };
}

export function fingerprintIdentity(
  fingerprint: MapCompatibilityFingerprint,
): string {
  return "mapfp_" + createHash("sha256")
    .update(JSON.stringify(fingerprint))
    .digest("hex")
    .slice(0, 20);
}
