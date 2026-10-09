import { describe, expect, it } from "vitest";
import {
  assessGameplayDiscoveryClosure,
} from "../../src/inspection/gameplay-discovery-closure.js";

describe("gameplay discovery closure", () => {
  it("keeps native world truncation visible even if indexed sources are complete", () => {
    const result = assessGameplayDiscoveryClosure({
      discoveredSurfaceIds: ["runtime:state"],
      sourceRelevantFiles: 1,
      sourceIndexedFiles: 1,
      sourceCoverageComplete: true,
      sourceParseFailures: 0,
      unsupportedRelevantSourcePaths: [],
      semanticUnderstandingGapPaths: [],
      unresolvedReferences: 0,
      nativeWorldScanIncomplete: true,
    });
    expect(result.status).toBe("OPEN");
    expect(result.nativeWorldScanIncomplete).toBe(true);
    expect(result.reasons.some(reason => reason.includes("native world scan"))).toBe(true);
  });

  it("opens when relevant source coverage is incomplete", () => {
    const result =
      assessGameplayDiscoveryClosure({
        discoveredSurfaceIds: [
          "phase:lobby",
        ],
        sourceRelevantFiles: 1,
        sourceIndexedFiles: 0,
        sourceCoverageComplete: false,
        sourceParseFailures: 1,
        unsupportedRelevantSourcePaths: [],
        semanticUnderstandingGapPaths: [],
        unresolvedReferences: 0,
      });

    expect(result.status).toBe("OPEN");
  });

  it("keeps unresolved references partial without losing discovered surfaces", () => {
    const result =
      assessGameplayDiscoveryClosure({
        discoveredSurfaceIds: [
          "phase:lobby",
          "runtime:state",
        ],
        sourceRelevantFiles: 1,
        sourceIndexedFiles: 1,
        sourceCoverageComplete: true,
        sourceParseFailures: 0,
        unsupportedRelevantSourcePaths: [],
        semanticUnderstandingGapPaths: [],
        unresolvedReferences: 1,
      });

    expect(result.status).toBe("PARTIAL");
    expect(
      result.discoveredSurfaceIds,
    ).toEqual([
      "phase:lobby",
      "runtime:state",
    ]);
  });

  it("opens when raw relevant source inventory is not balanced", () => {
    const result =
      assessGameplayDiscoveryClosure({
        discoveredSurfaceIds: [
          "runtime:state",
        ],
        sourceRelevantFiles: 3,
        sourceIndexedFiles: 1,
        sourceCoverageComplete: true,
        sourceParseFailures: 0,
        unsupportedRelevantSourcePaths: [],
        semanticUnderstandingGapPaths: [],
        unresolvedReferences: 0,
      });

    expect(result.status).toBe("OPEN");
    expect(
      result.sourceInventoryBalanced,
    ).toBe(false);
  });

  it("opens when gameplay-sensitive sources have no semantic owner", () => {
    const result =
      assessGameplayDiscoveryClosure({
        discoveredSurfaceIds: [
          "runtime:state",
        ],
        sourceRelevantFiles: 2,
        sourceIndexedFiles: 1,
        sourceCoverageComplete: false,
        sourceParseFailures: 0,
        unsupportedRelevantSourcePaths: [
          "feature_rules/ore.json",
        ],
        semanticUnderstandingGapPaths: [],
        unresolvedReferences: 0,
      });

    expect(result.status).toBe("OPEN");
    expect(
      result.unsupportedRelevantSources,
    ).toBe(1);
  });

  it("opens when gameplay sources are indexed but not semantically understood", () => {
    const result =
      assessGameplayDiscoveryClosure({
        discoveredSurfaceIds: [
          "runtime:state",
        ],
        sourceRelevantFiles: 1,
        sourceIndexedFiles: 1,
        sourceCoverageComplete: true,
        sourceParseFailures: 0,
        unsupportedRelevantSourcePaths: [],
        semanticUnderstandingGapPaths: [
          "loot_tables/reward.json",
        ],
        unresolvedReferences: 0,
      });

    expect(result.status).toBe("OPEN");
    expect(
      result.semanticUnderstandingGaps,
    ).toBe(1);
  });

  it("closes discovery when relevant sources are indexed and references resolve", () => {
    const result =
      assessGameplayDiscoveryClosure({
        discoveredSurfaceIds: [
          "runtime:state",
        ],
        sourceRelevantFiles: 1,
        sourceIndexedFiles: 1,
        sourceCoverageComplete: true,
        sourceParseFailures: 0,
        unsupportedRelevantSourcePaths: [],
        semanticUnderstandingGapPaths: [],
        unresolvedReferences: 0,
      });

    expect(result.status).toBe("COMPLETE");
  });

  it("does not claim COMPLETE while raw operations remain unowned", () => {
    const input = {
      discoveredSurfaceIds: ["runtime:state"],
      sourceRelevantFiles: 1,
      sourceIndexedFiles: 1,
      sourceCoverageComplete: true,
      sourceParseFailures: 0,
      unsupportedRelevantSourcePaths: [],
      semanticUnderstandingGapPaths: [],
      unresolvedReferences: 0,
    };
    expect(assessGameplayDiscoveryClosure(input).status).toBe("COMPLETE");
    const challenged = assessGameplayDiscoveryClosure({
      ...input,
      discoveryChallengeIds: ["discovery-challenge:state:unknown-mutation"],
    });
    expect(challenged.status).toBe("OPEN");
    expect(challenged.discoveryChallengeIds).toEqual([
      "discovery-challenge:state:unknown-mutation",
    ]);
  });
});
