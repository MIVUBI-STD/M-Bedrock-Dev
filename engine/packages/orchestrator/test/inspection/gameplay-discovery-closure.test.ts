import { describe, expect, it } from "vitest";
import {
  assessGameplayDiscoveryClosure,
} from "../../src/inspection/gameplay-discovery-closure.js";

describe("gameplay discovery closure", () => {
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
          "loot_tables/reward.json",
        ],
        unresolvedReferences: 0,
      });

    expect(result.status).toBe("OPEN");
    expect(
      result.unsupportedRelevantSources,
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
        unresolvedReferences: 0,
      });

    expect(result.status).toBe("COMPLETE");
  });
});
