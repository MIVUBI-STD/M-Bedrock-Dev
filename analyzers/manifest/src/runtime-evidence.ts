import type { EffectiveKnowledgeProfile } from "../../../packages/knowledge/src/types.js";
import type { RuntimeEvidenceRecord } from "../../../packages/project-model/src/runtime-evidence.js";
import { formatGameVersion } from "../../../packages/compatibility/src/version.js";
import { deriveManifestCompatibilityFacts } from "./compatibility.js";
import type { ManifestModel } from "./types.js";

function versionToString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length >= 3 && value.every((part) => typeof part === "number")) {
    return value.join(".");
  }
  return undefined;
}

export interface ManifestRuntimeEvidence {
  records: RuntimeEvidenceRecord[];
  profilePatch: Partial<EffectiveKnowledgeProfile>;
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

  if (manifest.formatVersion !== undefined) {
    records.push({
      predicate: "manifest-format-version-declared",
      state: "present",
      confidence: "observed",
      sourceRefs: [manifest.source],
      note: String(manifest.formatVersion),
    });
  }

  if (facts.minEngineVersion) {
    records.push({
      predicate: "min-engine-version-declared",
      state: "present",
      confidence: "observed",
      sourceRefs: [manifest.source],
      note: formatGameVersion(facts.minEngineVersion),
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
      predicate: "prerelease-script-module",
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
  const formatVersion = versionToString(manifest.formatVersion);

  return {
    records,
    profilePatch: {
      ...(facts.minEngineVersion
        ? { minecraftVersion: formatGameVersion(facts.minEngineVersion) }
        : {}),
      ...(formatVersion === undefined ? {} : { formatVersion }),
      ...(Object.keys(scriptModules).length > 0 ? { scriptModules } : {}),
      ...(facts.educationMetadata ? { edition: "education" } : {}),
    },
  };
}