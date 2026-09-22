import type { ManifestModel, ManifestModuleType } from "./types.js";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function normalizeModuleType(value: unknown): ManifestModuleType {
  switch (value) {
    case "data":
    case "resources":
    case "script":
    case "world_template":
    case "skin_pack":
    case "persona_piece":
      return value;
    default:
      return "unknown";
  }
}

export function analyzeManifest(raw: unknown, source: SourceRef): ManifestModel {
  const root = asRecord(raw) ?? {};
  const header = asRecord(root.header) ?? {};
  const modulesRaw = Array.isArray(root.modules) ? root.modules : [];
  const dependenciesRaw = Array.isArray(root.dependencies) ? root.dependencies : [];

  return {
    formatVersion:
      typeof root.format_version === "number" || typeof root.format_version === "string"
        ? root.format_version
        : undefined,
    headerUuid: typeof header.uuid === "string" ? header.uuid : undefined,
    headerVersion: header.version,
    name: typeof header.name === "string" ? header.name : undefined,
    description: typeof header.description === "string" ? header.description : undefined,
    minEngineVersion: header.min_engine_version,
    modules: modulesRaw.map((entry) => {
      const module = asRecord(entry) ?? {};
      return {
        uuid: typeof module.uuid === "string" ? module.uuid : undefined,
        type: normalizeModuleType(module.type),
        version: module.version,
        entry: typeof module.entry === "string" ? module.entry : undefined,
        language: typeof module.language === "string" ? module.language : undefined,
      };
    }),
    dependencies: dependenciesRaw.map((entry) => {
      const dependency = asRecord(entry) ?? {};
      return {
        uuid: typeof dependency.uuid === "string" ? dependency.uuid : undefined,
        moduleName:
          typeof dependency.module_name === "string" ? dependency.module_name : undefined,
        version: dependency.version,
      };
    }),
    hasEducationMetadata:
      typeof root.has_education_metadata === "boolean"
        ? root.has_education_metadata
        : undefined,
    source,
    raw,
  };
}

export function classifyPackFromManifest(
  manifest: ManifestModel,
): "behavior_pack" | "resource_pack" | "script_pack" | "mixed_pack" | "unknown" {
  const types = new Set(manifest.modules.map((module) => module.type));

  const hasData = types.has("data");
  const hasResources = types.has("resources");
  const hasScript = types.has("script");

  if ((hasData && hasResources) || (hasData && hasScript) || (hasResources && hasScript)) {
    return "mixed_pack";
  }
  if (hasData) return "behavior_pack";
  if (hasResources) return "resource_pack";
  if (hasScript) return "script_pack";
  return "unknown";
}
