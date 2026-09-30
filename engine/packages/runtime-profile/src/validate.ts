import type {
  InventoryCompleteness,
  MinecraftProductEdition,
  MinecraftRuntimeHost,
  MinecraftRuntimeProfile,
  ScriptModuleTrack,
} from "./types.js";
import {
  compareDottedNumericVersions,
  parseScriptSemver,
} from "./version.js";

const EDITIONS = new Set<MinecraftProductEdition>([
  "bedrock-retail",
  "bedrock-preview",
  "education",
]);

const HOSTS = new Set<MinecraftRuntimeHost>([
  "client",
  "listen-server",
  "dedicated-server",
  "realm",
  "education-host",
  "editor",
]);

const TRACKS = new Set<ScriptModuleTrack>([
  "stable",
  "beta",
  "experimental",
  "internal",
  "unknown",
]);

const COMPLETENESS = new Set<InventoryCompleteness>([
  "complete",
  "partial",
  "unknown",
]);

export function validateMinecraftRuntimeProfile(
  profile: MinecraftRuntimeProfile,
): string[] {
  const errors: string[] = [];

  if (profile.schemaVersion !== 2) {
    errors.push("Runtime profile schemaVersion must be 2.");
  }
  if (profile.product.family !== "bedrock-engine") {
    errors.push("Runtime profile product family must be bedrock-engine.");
  }
  if (!EDITIONS.has(profile.product.edition)) {
    errors.push("Runtime profile has an unknown product edition.");
  }
  if (!HOSTS.has(profile.host)) {
    errors.push("Runtime profile has an unknown host.");
  }
  if (
    compareDottedNumericVersions(
      profile.product.version,
      profile.product.version,
    ) === undefined
  ) {
    errors.push("Runtime profile product version must be dotted numeric.");
  }

  for (const [name, module] of Object.entries(profile.scriptModules)) {
    if (!name.trim()) {
      errors.push("Runtime profile script module name must be non-empty.");
      continue;
    }
    if (!parseScriptSemver(module.version)) {
      errors.push(
        "Runtime profile script module version must be valid semver: " + name,
      );
    }
    if (!TRACKS.has(module.track)) {
      errors.push(
        "Runtime profile script module has an unknown track: " + name,
      );
    }
  }

  for (const key of [
    "scriptModules",
    "experiments",
    "worldSettings",
    "packs",
  ] as const) {
    if (!COMPLETENESS.has(profile.inventory[key])) {
      errors.push(
        "Runtime profile inventory completeness is invalid for " + key + ".",
      );
    }
  }

  return errors;
}
