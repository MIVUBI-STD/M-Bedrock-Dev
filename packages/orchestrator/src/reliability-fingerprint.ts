import { tokenizeCommand } from "../../../analyzers/commands/src/tokenize.js";
import { flattenCommandEffects } from "../../../analyzers/commands/src/flatten.js";
import type { ParsedFunction } from "../../../analyzers/functions/src/types.js";
import type { ParsedScriptFile } from "../../../analyzers/scripts/src/types.js";
import type { DiagnosticFinding } from "../../diagnostics/src/types.js";
import {
  createMapCompatibilityFingerprint,
  fingerprintIdentity,
} from "../../reliability/src/fingerprint.js";
import type {
  MapCompatibilityFingerprint,
  ReliabilityDomain,
} from "../../reliability/src/types.js";
import type { InspectedPack, InspectTargetProfile } from "./types.js";

export interface ReliabilityFingerprintInput {
  mapId: string;
  artifactFingerprint?: string;
  packs: readonly InspectedPack[];
  functions: readonly ParsedFunction[];
  scripts: readonly ParsedScriptFile[];
  structures: number;
  parsedStructures: number;
  entities: number;
  entityKnowledgeGaps: number;
  worldDatabasePresent: boolean;
  stateAccesses: number;
  broadStateWrites: number;
  repeatedTopologyCandidates: number;
  diagnostics: readonly DiagnosticFinding[];
  target: InspectTargetProfile;
}

export interface ReliabilityFingerprintResult {
  id: string;
  fingerprint: MapCompatibilityFingerprint;
}

function commandVerbs(functions: readonly ParsedFunction[]): string[] {
  const verbs = new Set<string>();

  for (const fn of functions) {
    for (const command of fn.commands) {
      const token = tokenizeCommand(command.raw)[0]?.toLowerCase();
      if (token) verbs.add(token);

      for (const effect of flattenCommandEffects(command.analysis)) {
        if (effect.kind === "nested-command") continue;
        if (effect.kind === "structure-load") verbs.add("structure");
        if (effect.kind === "function-call") verbs.add("function");
      }
    }
  }

  return [...verbs].sort();
}

function scriptModules(
  packs: readonly InspectedPack[],
  scripts: readonly ParsedScriptFile[],
): string[] {
  const modules = new Set<string>();

  for (const pack of packs) {
    for (const module of pack.scriptModules) modules.add(module.moduleName);
  }

  for (const script of scripts) {
    for (const imported of script.imports) {
      if (imported.kind === "minecraft") modules.add(imported.module);
    }
  }

  return [...modules].sort();
}

export function deriveReliabilityFingerprint(
  input: ReliabilityFingerprintInput,
): ReliabilityFingerprintResult {
  const domains = new Set<ReliabilityDomain>();
  const capabilityTags = new Set<string>();
  const riskSurfaces = new Set<string>();
  const verbs = commandVerbs(input.functions);
  const modules = scriptModules(input.packs, input.scripts);

  if (input.functions.length > 0) domains.add("commands");
  if (input.scripts.length > 0) domains.add("scripts");
  if (input.structures > 0) domains.add("structures");
  if (input.entities > 0) domains.add("entities");
  if (input.worldDatabasePresent) domains.add("world-db");
  if (input.stateAccesses > 0) domains.add("state");
  if (input.packs.length > 0) domains.add("compatibility");
  if (
    input.target.edition === "education" ||
    input.packs.some((pack) => pack.educationMetadata)
  ) {
    domains.add("education");
  }

  for (const verb of verbs) capabilityTags.add(`command:${verb}`);

  for (const module of modules) {
    capabilityTags.add(`script-module:${module}`);
  }

  if (input.structures > 0) capabilityTags.add("structures");
  if (input.entities > 0) capabilityTags.add("entities");
  if (input.entityKnowledgeGaps > 0) {
    capabilityTags.add("entity-knowledge-gap");
    riskSurfaces.add("entity-ai");
  }
  if (verbs.includes("structure")) capabilityTags.add("structure-load");

  if (input.stateAccesses > 0) capabilityTags.add("gameplay-state");
  if (input.broadStateWrites > 0) {
    capabilityTags.add("broad-state-write");
    riskSurfaces.add("multiplayer-concurrency");
  }

  if (input.repeatedTopologyCandidates > 0) {
    capabilityTags.add("repeated-topology");
    riskSurfaces.add("repeated-topology");
  }

  if (input.worldDatabasePresent) {
    capabilityTags.add("world-db");
    riskSurfaces.add("world-db-native");
  }

  for (const pack of input.packs) {
    if (pack.educationMetadata) capabilityTags.add("education-metadata");
    for (const module of pack.scriptModules) {
      if (module.track === "beta" || module.track === "internal") {
        riskSurfaces.add("script-beta");
      }
    }
  }

  for (const script of input.scripts) {
    if (script.dynamicProperties.length > 0) {
      capabilityTags.add("dynamic-properties");
    }
    if (script.events.length > 0) {
      capabilityTags.add("script-events");
    }
    if (script.capabilities.some((item) => item.capability === "script-event")) {
      capabilityTags.add("script-event-receive");
    }
  }

  if (input.diagnostics.some((finding) => finding.code === "UNKNOWN_COMMAND_EFFECT")) {
    riskSurfaces.add("unknown-command");
  }
  if (input.diagnostics.some((finding) => finding.code === "UNRESOLVED_REFERENCE")) {
    riskSurfaces.add("reference-integrity");
  }
  if (input.diagnostics.some((finding) => finding.code === "STRUCTURE_PARSE_FAILED")) {
    riskSurfaces.add("structure-binary");
  }
  if (input.diagnostics.some((finding) => finding.code === "SCRIPT_API_DEPRECATED_SYMBOL")) {
    capabilityTags.add("script-legacy-api");
    riskSurfaces.add("script-deprecated-api");
  }
  if (input.diagnostics.some((finding) => finding.code === "SCRIPT_API_REMOVED_SYMBOL")) {
    capabilityTags.add("script-legacy-api");
    riskSurfaces.add("script-removed-api");
  }
  if (input.diagnostics.some((finding) => finding.code === "SCRIPT_API_SIGNATURE_INCOMPATIBLE")) {
    capabilityTags.add("script-signature-migration");
    riskSurfaces.add("script-signature");
  }
  if (input.diagnostics.some((finding) => finding.code === "SCRIPT_API_RETURN_CONTRACT_RISK")) {
    capabilityTags.add("script-return-contract");
    riskSurfaces.add("script-return-optional");
  }

  const editions = input.target.edition ? [input.target.edition] : [];
  const minEngineVersions = input.packs
    .map((pack) => pack.minEngineVersion)
    .filter((value): value is string => typeof value === "string");

  const fingerprint = createMapCompatibilityFingerprint({
    mapId: input.mapId,
    ...(input.artifactFingerprint
      ? { artifactFingerprint: input.artifactFingerprint }
      : {}),
    minEngineVersions,
    editions,
    experiments: input.target.experiments ?? [],
    commandVerbs: verbs,
    scriptModules: modules,
    capabilityTags: [...capabilityTags],
    domains: [...domains],
    structureCount: input.structures,
    parsedStructureCount: input.parsedStructures,
    worldDatabasePresent: input.worldDatabasePresent,
    riskSurfaces: [...riskSurfaces],
  });

  return {
    id: fingerprintIdentity(fingerprint),
    fingerprint,
  };
}
