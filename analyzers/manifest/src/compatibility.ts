import type { ManifestModel } from "./types.js";
import { classifyScriptApiVersion } from "../../../packages/compatibility/src/script-api.js";
import { parseGameVersion } from "../../../packages/compatibility/src/version.js";

export interface ManifestCompatibilityFacts {
  minEngineVersion?: ReturnType<typeof parseGameVersion>;
  scriptModules: Array<{
    moduleName: string;
    version: string;
    track: ReturnType<typeof classifyScriptApiVersion>["track"];
  }>;
  educationMetadata: boolean;
}

function versionString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length >= 3) return value.join(".");
  return undefined;
}

export function deriveManifestCompatibilityFacts(
  manifest: ManifestModel,
): ManifestCompatibilityFacts {
  const scriptModules: ManifestCompatibilityFacts["scriptModules"] = [];

  for (const dependency of manifest.dependencies) {
    if (!dependency.moduleName) continue;
    const version = versionString(dependency.version);
    if (!version) continue;

    const classified = classifyScriptApiVersion(dependency.moduleName, version);
    scriptModules.push(classified);
  }

  const result: ManifestCompatibilityFacts = {
    scriptModules,
    educationMetadata: manifest.hasEducationMetadata === true,
  };

  const minEngineVersion = parseGameVersion(manifest.minEngineVersion);
  if (minEngineVersion) result.minEngineVersion = minEngineVersion;

  return result;
}
