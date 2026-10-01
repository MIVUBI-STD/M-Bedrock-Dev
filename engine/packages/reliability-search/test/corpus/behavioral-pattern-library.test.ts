import { describe, expect, it } from "vitest";
import { buildBehavioralPatternLibrary } from "../../src/index.js";

describe("behavioral pattern library", () => {
  it("promotes only reviewed cross-map support", () => {
    const library = buildBehavioralPatternLibrary([
      { mapId: "map-a", patternId: "multi-arena-independent-start", implementationVariant: "join-pad", failureSignatures: ["global-start-owner"], evidenceIds: ["a1"], status: "observed" },
      { mapId: "map-b", patternId: "multi-arena-independent-start", implementationVariant: "direct-start", failureSignatures: [], evidenceIds: ["b1"], status: "observed" },
    ]);
    expect(library.patterns[0]?.state).toBe("reusable-pattern");
    expect(library.patterns[0]?.distinctMaps).toBe(2);
  });

  it("keeps rejected evidence as candidate", () => {
    const library = buildBehavioralPatternLibrary([
      { mapId: "map-a", patternId: "shared-timer", evidenceIds: ["a"], status: "observed" },
      { mapId: "map-b", patternId: "shared-timer", evidenceIds: ["b"], status: "rejected" },
    ]);
    expect(library.patterns[0]?.state).toBe("candidate");
  });
});
