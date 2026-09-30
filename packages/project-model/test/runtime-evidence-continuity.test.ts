import { describe, expect, it } from "vitest";
import {
  evaluateRuntimeEvidenceContinuity,
} from "../src/runtime-evidence-continuity.js";

describe("runtime evidence continuity", () => {
  it("rejects mixed arena generations in one proof campaign", () => {
    const result = evaluateRuntimeEvidenceContinuity(
      [
        {
          predicate: "arena-ready",
          state: "present",
          confidence: "observed",
          targetProfileFingerprint: "profile-a",
          scope: {
            arenaId: "arena-2",
            arenaGeneration: 4,
          },
        },
        {
          predicate: "arena-released",
          state: "present",
          confidence: "observed",
          targetProfileFingerprint: "profile-a",
          scope: {
            arenaId: "arena-2",
            arenaGeneration: 5,
          },
        },
      ],
      {
        targetProfileFingerprint: "profile-a",
        scope: {
          arenaId: "arena-2",
          arenaGeneration: 4,
        },
      },
    );

    expect(result.status).toBe("broken");
    expect(result.acceptedRecords).toHaveLength(1);
    expect(result.rejectedRecords).toHaveLength(1);
  });
});
