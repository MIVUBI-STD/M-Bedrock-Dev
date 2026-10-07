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

export interface EducationTargetProfile {
  edition: "education" | "bedrock";
  educationMetadata: boolean;
  codeBuilderTrack: "supported-profile" | "not-declared";
  versionTrack: "education-distinct" | "bedrock-default";
  sharedBedrockFactsRequireEditionGate: boolean;
}

export function deriveEducationTargetProfile(
  manifest: ManifestModel,
): EducationTargetProfile {
  const educationMetadata =
    manifest.hasEducationMetadata === true;
  return {
    edition: educationMetadata ? "education" : "bedrock",
    educationMetadata,
    codeBuilderTrack: educationMetadata
      ? "supported-profile"
      : "not-declared",
    versionTrack: educationMetadata
      ? "education-distinct"
      : "bedrock-default",
    sharedBedrockFactsRequireEditionGate:
      educationMetadata,
  };
}
