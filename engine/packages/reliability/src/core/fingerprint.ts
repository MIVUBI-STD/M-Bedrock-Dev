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
  mapVersion?: string;
  evidenceBasis?: "artifact-inspection" | "historical-regression";
  evidenceRefs?: readonly string[];
  architectureTags?: readonly string[];
  gameplayPatternTags?: readonly string[];
  knownInvariantIds?: readonly string[];
  knownRegressionIds?: readonly string[];
  failurePatternIds?: readonly string[];
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
    ...(facts.mapVersion === undefined ? {} : { mapVersion: facts.mapVersion }),
    ...(facts.evidenceBasis === undefined ? {} : { evidenceBasis: facts.evidenceBasis }),
    ...(facts.evidenceRefs === undefined ? {} : { evidenceRefs: uniqueSorted(facts.evidenceRefs) }),
    ...(facts.architectureTags === undefined ? {} : { architectureTags: uniqueSorted(facts.architectureTags) }),
    ...(facts.gameplayPatternTags === undefined ? {} : { gameplayPatternTags: uniqueSorted(facts.gameplayPatternTags) }),
    ...(facts.knownInvariantIds === undefined ? {} : { knownInvariantIds: uniqueSorted(facts.knownInvariantIds) }),
    ...(facts.knownRegressionIds === undefined ? {} : { knownRegressionIds: uniqueSorted(facts.knownRegressionIds) }),
    ...(facts.failurePatternIds === undefined ? {} : { failurePatternIds: uniqueSorted(facts.failurePatternIds) }),
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
