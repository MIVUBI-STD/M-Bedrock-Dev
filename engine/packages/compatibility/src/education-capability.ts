import type { EducationProfile } from "./education.js";

export interface EducationCapabilityResult {
  supported: boolean | "unknown";
  reason: string;
}

export function requireEducationFeatures(
  profile: EducationProfile,
): EducationCapabilityResult {
  if (profile.educationFeatures === "enabled") {
    return {
      supported: true,
      reason: "Education feature set is enabled for the target environment.",
    };
  }

  if (profile.educationFeatures === "disabled") {
    return {
      supported: false,
      reason: "Education feature set is disabled for the target environment.",
    };
  }

  return {
    supported: "unknown",
    reason: "Education feature state is not known from the available evidence.",
  };
}
