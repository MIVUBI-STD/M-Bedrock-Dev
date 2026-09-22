import type { ManifestModel } from "./types.js";

export interface ManifestEducationSignal {
  declared: boolean;
  source: ManifestModel["source"];
}

export function manifestEducationSignal(
  manifest: ManifestModel,
): ManifestEducationSignal {
  return {
    declared: manifest.hasEducationMetadata === true,
    source: manifest.source,
  };
}
