export type ScriptApiTrack = "stable" | "beta" | "internal" | "unknown";

export interface ScriptModuleVersion {
  moduleName: string;
  version: string;
  track: ScriptApiTrack;
}

export function classifyScriptApiVersion(
  moduleName: string,
  version: string,
): ScriptModuleVersion {
  const normalized = version.trim().toLowerCase();
  let track: ScriptApiTrack = "stable";

  if (normalized.includes("-beta")) track = "beta";
  else if (normalized.includes("-internal")) track = "internal";
  else if (!/^\d+\.\d+\.\d+/.test(normalized)) track = "unknown";

  return { moduleName, version, track };
}
