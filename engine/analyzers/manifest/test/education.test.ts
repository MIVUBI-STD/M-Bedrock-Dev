import { describe, expect, it } from "vitest";
import { deriveEducationTargetProfile } from "../src/education.js";

const source = { artifactId: "fixture", relativePath: "manifest.json" };

describe("education target profile", () => {
  it("keeps Education as an explicit edition/version capability gate", () => {
    const result = deriveEducationTargetProfile({
      modules: [],
      dependencies: [],
      hasEducationMetadata: true,
      source,
      raw: {},
    });
    expect(result).toMatchObject({
      edition: "education",
      codeBuilderTrack: "supported-profile",
      versionTrack: "education-distinct",
      sharedBedrockFactsRequireEditionGate: true,
    });
  });

  it("does not infer Education capability from a normal Bedrock manifest", () => {
    expect(deriveEducationTargetProfile({
      modules: [],
      dependencies: [],
      source,
      raw: {},
    }).edition).toBe("bedrock");
  });
});
