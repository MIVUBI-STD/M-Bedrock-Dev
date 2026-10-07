import { describe, expect, it } from "vitest";
import { analyzeEducationPermissionBlocks } from "../src/education-permission.js";

const structure = {
  entityCount: 0,
  hasEntities: false,
  paletteSize: 3,
  hasBlockPositionData: false,
  commandBlockPaletteEntries: 0,
  containerPaletteEntries: 0,
  embeddedCommandBlocks: 0,
  queuedTickPositions: 0,
  educationAllowEntries: 1,
  educationDenyEntries: 1,
  educationBorderEntries: 1,
};

describe("education permission blocks", () => {
  it("correlates specialty-block presence with an Education target profile", () => {
    const result = analyzeEducationPermissionBlocks(structure, {
      edition: "education",
      educationMetadata: true,
      codeBuilderTrack: "supported-profile",
      versionTrack: "education-distinct",
      sharedBedrockFactsRequireEditionGate: true,
    });
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        identifier: "minecraft:allow",
        semantic: "build-permission",
        applicability: "applicable",
      }),
      expect.objectContaining({
        identifier: "minecraft:deny",
        semantic: "build-restriction",
      }),
      expect.objectContaining({
        identifier: "minecraft:border_block",
        semantic: "vertical-force-field",
      }),
    ]));
  });

  it("keeps specialty-block presence separate from edition applicability", () => {
    const result = analyzeEducationPermissionBlocks(structure, {
      edition: "bedrock",
      educationMetadata: false,
      codeBuilderTrack: "not-declared",
      versionTrack: "bedrock-default",
      sharedBedrockFactsRequireEditionGate: false,
    });
    expect(result.every((item) => item.applicability === "profile-mismatch")).toBe(true);
  });
});
