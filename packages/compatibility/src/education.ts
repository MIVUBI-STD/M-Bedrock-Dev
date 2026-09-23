import type { MinecraftEdition } from "./types.js";

export interface EducationSignals {
  edition: MinecraftEdition | "unknown";
  manifestEducationMetadata?: boolean;
  worldEducationFeatures?: boolean;
  eduLevel?: number;
}

export type EducationFeatureState = "enabled" | "disabled" | "unknown";

export interface EducationProfile {
  edition: MinecraftEdition | "unknown";
  educationFeatures: EducationFeatureState;
  manifestEducationMetadata: boolean | "unknown";
  eduLevel?: number;
  evidence: string[];
}

export function deriveEducationProfile(
  signals: EducationSignals,
): EducationProfile {
  const evidence: string[] = [];
  let educationFeatures: EducationFeatureState = "unknown";

  if (signals.worldEducationFeatures === true) {
    educationFeatures = "enabled";
    evidence.push("world setting enables Education features");
  } else if (signals.worldEducationFeatures === false) {
    educationFeatures = "disabled";
    evidence.push("world setting disables Education features");
  } else if (signals.edition === "education") {
    educationFeatures = "enabled";
    evidence.push("target edition is Minecraft Education");
  }

  const profile: EducationProfile = {
    edition: signals.edition,
    educationFeatures,
    manifestEducationMetadata:
      signals.manifestEducationMetadata ?? "unknown",
    evidence,
  };

  if (signals.eduLevel !== undefined) profile.eduLevel = signals.eduLevel;
  if (signals.manifestEducationMetadata === true) {
    profile.evidence.push("pack manifest declares has_education_metadata");
  }

  return profile;
}
