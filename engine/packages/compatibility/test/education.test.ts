import { describe, expect, it } from "vitest";
import {
  deriveEducationProfile,
  requireEducationFeatures,
} from "../src/index.js";

describe("Education capability profile", () => {
  it("treats Minecraft Education edition as Education-feature capable", () => {
    const profile = deriveEducationProfile({
      edition: "education",
    });

    expect(profile.educationFeatures).toBe("enabled");
    expect(requireEducationFeatures(profile).supported).toBe(true);
  });

  it("allows Bedrock worlds to explicitly enable Education features", () => {
    const profile = deriveEducationProfile({
      edition: "bedrock",
      worldEducationFeatures: true,
      eduLevel: 1,
    });

    expect(profile.educationFeatures).toBe("enabled");
    expect(profile.eduLevel).toBe(1);
  });

  it("preserves unknown edition without assuming Bedrock", () => {
    const profile = deriveEducationProfile({
      edition: "unknown",
    });

    expect(profile.edition).toBe("unknown");
    expect(profile.educationFeatures).toBe("unknown");
    expect(requireEducationFeatures(profile).supported).toBe("unknown");
  });

  it("does not treat manifest education metadata as proof that world features are enabled", () => {
    const profile = deriveEducationProfile({
      edition: "bedrock",
      manifestEducationMetadata: true,
    });

    expect(profile.educationFeatures).toBe("unknown");
    expect(profile.manifestEducationMetadata).toBe(true);
  });
});
