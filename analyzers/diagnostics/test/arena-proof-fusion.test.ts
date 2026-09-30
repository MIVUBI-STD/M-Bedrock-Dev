import { describe, expect, it } from "vitest";
import {
  fuseArenaParityAndSpatialEvidence,
} from "../src/arena-proof-fusion.js";

describe("arena proof fusion", () => {
  it("requires corroboration before confirming a physical arena divergence", () => {
    const result = fuseArenaParityAndSpatialEvidence(
      {
        referenceArenaId: "a1",
        targetArenaId: "a2",
        status: "divergent",
        evidenceLayers: ["script-config"],
        mismatches: [],
        exceptedMismatchCount: 0,
      },
      {
        totalDifferences: 1,
        gameplayDifferences: 1,
        decorativeDifferences: 0,
        ignoredDifferences: 0,
        unknownDifferences: 0,
        differences: [],
      },
    );

    expect(result.disposition).toBe(
      "confirmed-divergence",
    );
  });
});
