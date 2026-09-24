import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { discoverPackCandidates } from "../../../analyzers/discovery/src/index.js";
import {
  analyzeManifest,
  classifyPackFromManifest,
} from "../../../analyzers/manifest/src/index.js";
import { deriveManifestCompatibilityFacts } from "../../../analyzers/manifest/src/index.js";
import type { ManifestModel } from "../../../analyzers/manifest/src/index.js";
import type { FileInventoryEntry } from "../../project-model/src/project.js";
import type { InspectedPack } from "./types.js";

export interface InspectionPackDiscovery {
  packs: InspectedPack[];
  manifests: Array<{
    root: string;
    manifest: ManifestModel;
  }>;
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
