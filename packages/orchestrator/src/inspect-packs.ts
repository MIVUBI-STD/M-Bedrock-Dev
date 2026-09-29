import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { discoverPackCandidates } from "../../../analyzers/discovery/src/index.js";
import {
  analyzeManifest,
  classifyPackFromManifest,
} from "../../../analyzers/manifest/src/index.js";
import { deriveManifestCompatibilityFacts } from "../../../analyzers/manifest/src/index.js";
import type { ManifestModel } from "../../../analyzers/manifest/src/index.js";
import type { FileInventoryEntry } from "../../project-model/src/index.js";
import type { InspectedPack } from "./types.js";

export interface InspectionPackDiscovery {
  packs: InspectedPack[];
  manifests: Array<{
    root: string;
    manifest: ManifestModel;
  }>;
}

function formatManifestVersion(
  value: unknown,
): string | undefined {
  if (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.slice(0, 3).every(
      (item) =>
        typeof item === "number" &&
        Number.isInteger(item) &&
        item >= 0,
    )
  ) {
    return value.slice(0, 3).join(".");
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    const item = value as Record<string, unknown>;
    if (
      typeof item.major === "number" &&
      typeof item.minor === "number" &&
      typeof item.patch === "number"
    ) {
      return `${item.major}.${item.minor}.${item.patch}`;
    }
  }
  return undefined;
}

function formatVersion(
  value:
    | { major: number; minor: number; patch: number }
    | undefined,
): string | undefined {
  return value
    ? `${value.major}.${value.minor}.${value.patch}`
    : undefined;
}

export async function discoverInspectionPacks(
  root: string,
  artifactId: string,
  files: readonly FileInventoryEntry[],
): Promise<InspectionPackDiscovery> {
  const packs: InspectedPack[] = [];
  const manifests: Array<{
    root: string;
    manifest: ManifestModel;
  }> = [];

  for (const pack of discoverPackCandidates(files)) {
    const raw = JSON.parse(
      await readFile(join(root, pack.manifestPath), "utf8"),
    ) as unknown;
    const manifest = analyzeManifest(raw, {
      artifactId,
      relativePath: pack.manifestPath,
    });
    const compatibility =
      deriveManifestCompatibilityFacts(manifest);

    manifests.push({
      root: pack.root,
      manifest,
    });

    const normalizedPack: InspectedPack = {
      root: pack.root,
      type: classifyPackFromManifest(manifest),
      educationMetadata: compatibility.educationMetadata,
      scriptModules: compatibility.scriptModules,
    };

    if (manifest.headerUuid) {
      normalizedPack.uuid = manifest.headerUuid;
    }

    const packVersion =
      formatManifestVersion(manifest.headerVersion);
    if (packVersion) {
      normalizedPack.packVersion = packVersion;
    }

    const minEngineVersion = formatVersion(
      compatibility.minEngineVersion,
    );
    if (minEngineVersion) {
      normalizedPack.minEngineVersion = minEngineVersion;
    }

    packs.push(normalizedPack);
  }

  return { packs, manifests };
}
