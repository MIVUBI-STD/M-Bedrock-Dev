import type { EffectiveKnowledgeProfile } from "../../../packages/knowledge/src/index.js";
import type { ProjectSession } from "../../../packages/project-model/src/index.js";
import type { RuntimeEvidenceRecord } from "../../../packages/project-model/src/index.js";
import { formatGameVersion } from "../../../packages/compatibility/src/index.js";
import { deriveManifestCompatibilityFacts } from "./compatibility.js";
import type { ManifestModel } from "./types.js";

export interface ManifestRuntimeEvidence {
  records: RuntimeEvidenceRecord[];
  scriptModules: Readonly<Record<string, string>>;
  declaredMinEngineVersion?: string;
  manifestFormatVersion?: string;
}

function manifestFormatVersion(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

export function manifestRuntimeEvidence(
  manifest: ManifestModel,
): ManifestRuntimeEvidence {
  const facts = deriveManifestCompatibilityFacts(manifest);
  const records: RuntimeEvidenceRecord[] = [{
    predicate: "manifest-runtime-profile-source",
    state: "present",
    confidence: "observed",
    sourceRefs: [manifest.source],
  }];

  const formatVersion = manifestFormatVersion(manifest.formatVersion);
  if (formatVersion !== undefined) {
    records.push({
      predicate: "manifest-format-version-declared",
      state: "present",
      confidence: "observed",
      sourceRefs: [manifest.source],
      note: formatVersion,
    });
  }

  const declaredMinEngineVersion = facts.minEngineVersion
    ? formatGameVersion(facts.minEngineVersion)
    : undefined;
  if (declaredMinEngineVersion !== undefined) {
    records.push({
      predicate: "min-engine-version-declared",
      state: "present",
      confidence: "observed",
      sourceRefs: [manifest.source],
      note: declaredMinEngineVersion,
    });
  }

  if (facts.scriptModules.length > 0) {
    records.push({
      predicate: "script-module-dependencies-declared",
      state: "present",
      confidence: "observed",
      sourceRefs: [manifest.source],
      note: facts.scriptModules.map((module) => module.moduleName + "@" + module.version).join(", "),
    });
  }

  if (facts.scriptModules.some((module) => module.track !== "stable")) {
    records.push({
      predicate: "nonstable-script-module",
      state: "present",
      confidence: "observed",
      sourceRefs: [manifest.source],
    });
  }

  if (facts.educationMetadata) {
    records.push({
      predicate: "education-metadata",
      state: "present",
      confidence: "observed",
      sourceRefs: [manifest.source],
    });
  }

  const scriptModules = Object.fromEntries(
    facts.scriptModules.map((module) => [module.moduleName, module.version]),
  );

  return {
    records,
    scriptModules,
    ...(declaredMinEngineVersion === undefined ? {} : { declaredMinEngineVersion }),
    ...(formatVersion === undefined ? {} : { manifestFormatVersion: formatVersion }),
  };
}

export interface KnowledgeProfileResolution {
  profile?: EffectiveKnowledgeProfile;
  conflicts: readonly string[];
}

export function resolveKnowledgeProfile(
  session: ProjectSession,
  manifests: readonly ManifestModel[],
): KnowledgeProfileResolution {
  const conflicts: string[] = [];
  const modules = new Map<string, string>();
  const conflictedModules = new Set<string>();

  for (const manifest of manifests) {
    for (const [name, version] of Object.entries(manifestRuntimeEvidence(manifest).scriptModules)) {
      const existing = modules.get(name);
      if (existing !== undefined && existing !== version) {
        conflicts.push("Conflicting script module versions for " + name + ": " + existing + " vs " + version);
        conflictedModules.add(name);
        modules.delete(name);
        continue;
      }
      if (!conflictedModules.has(name)) modules.set(name, version);
    }
  }

  if (session.targetEdition === "unknown") {
    return { conflicts: [...new Set(conflicts)].sort() };
  }

  const scriptModules = Object.fromEntries([...modules.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const profile: EffectiveKnowledgeProfile = {
    edition: session.targetEdition,
    ...(session.targetVersion === undefined ? {} : { minecraftVersion: session.targetVersion }),
    ...(Object.keys(scriptModules).length === 0 ? {} : { scriptModules }),
  };

  return { profile, conflicts: [...new Set(conflicts)].sort() };
}