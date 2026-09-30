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

  it("allows multiple players when each owner keeps stable generations", () => {
    const result = evaluateRuntimeEvidenceContinuity(
      [
        {
          predicate: "player-a-ready",
          state: "present",
          confidence: "observed",
          provenanceKey: "trial:1",
          targetProfileFingerprint: "profile-a",
          scope: {
            arenaId: "arena-2",
            arenaGeneration: 4,
            playerKey: "player-a",
            participationGeneration: 1,
          },
        },
        {
          predicate: "player-b-ready",
          state: "present",
          confidence: "observed",
          provenanceKey: "trial:1",
          targetProfileFingerprint: "profile-a",
          scope: {
            arenaId: "arena-2",
            arenaGeneration: 4,
            playerKey: "player-b",
            participationGeneration: 1,
          },
        },
      ],
      {
        targetProfileFingerprint: "profile-a",
        provenanceKey: "trial:1",
        scope: {
          arenaId: "arena-2",
          arenaGeneration: 4,
        },
      },
    );

    expect(result.status).toBe("continuous");
  });

  it("rejects generation drift for the same player owner", () => {
    const result = evaluateRuntimeEvidenceContinuity(
      [
        {
          predicate: "joined",
          state: "present",
          confidence: "observed",
          targetProfileFingerprint: "profile-a",
          scope: {
            arenaId: "arena-2",
            arenaGeneration: 4,
            playerKey: "player-a",
            participationGeneration: 1,
          },
        },
        {
          predicate: "mutated",
          state: "present",
          confidence: "observed",
          targetProfileFingerprint: "profile-a",
          scope: {
            arenaId: "arena-2",
            arenaGeneration: 4,
            playerKey: "player-a",
            participationGeneration: 2,
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
    expect(result.reasons.join(" ")).toMatch(
      /participationGeneration/,
    );
  });

});
