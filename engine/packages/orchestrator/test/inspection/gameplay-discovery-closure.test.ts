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
        sourceCoverageComplete: false,
        sourceParseFailures: 1,
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
        sourceCoverageComplete: true,
        sourceParseFailures: 0,
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

  it("closes discovery when relevant sources are indexed and references resolve", () => {
    const result =
      assessGameplayDiscoveryClosure({
        discoveredSurfaceIds: [
          "runtime:state",
        ],
        sourceCoverageComplete: true,
        sourceParseFailures: 0,
        unresolvedReferences: 0,
      });

    expect(result.status).toBe("COMPLETE");
  });
});
