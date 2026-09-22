import type { ManifestDependency, ManifestModel, ManifestModule, ManifestModuleType } from "./types.js";
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

function normalizeModule(entry: unknown): ManifestModule {
  const module = asRecord(entry) ?? {};
  const result: ManifestModule = { type: normalizeModuleType(module.type) };

  if (typeof module.uuid === "string") result.uuid = module.uuid;
  if ("version" in module) result.version = module.version;
  if (typeof module.entry === "string") result.entry = module.entry;
  if (typeof module.language === "string") result.language = module.language;

  return result;
}

function normalizeDependency(entry: unknown): ManifestDependency {
  const dependency = asRecord(entry) ?? {};
  const result: ManifestDependency = {};

  if (typeof dependency.uuid === "string") result.uuid = dependency.uuid;
  if (typeof dependency.module_name === "string") result.moduleName = dependency.module_name;
  if ("version" in dependency) result.version = dependency.version;

  return result;
}

export function analyzeManifest(raw: unknown, source: SourceRef): ManifestModel {
  const root = asRecord(raw) ?? {};
  const header = asRecord(root.header) ?? {};
  const modulesRaw = Array.isArray(root.modules) ? root.modules : [];
  const dependenciesRaw = Array.isArray(root.dependencies) ? root.dependencies : [];

  const result: ManifestModel = {
    modules: modulesRaw.map(normalizeModule),
    dependencies: dependenciesRaw.map(normalizeDependency),
    source,
    raw,
  };

  if (typeof root.format_version === "number" || typeof root.format_version === "string") {
    result.formatVersion = root.format_version;
  }
  if (typeof header.uuid === "string") result.headerUuid = header.uuid;
  if ("version" in header) result.headerVersion = header.version;
  if (typeof header.name === "string") result.name = header.name;
  if (typeof header.description === "string") result.description = header.description;
  if ("min_engine_version" in header) result.minEngineVersion = header.min_engine_version;
  if (typeof root.has_education_metadata === "boolean") {
    result.hasEducationMetadata = root.has_education_metadata;
  }

  return result;
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
