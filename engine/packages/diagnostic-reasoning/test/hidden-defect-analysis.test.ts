import { describe, expect, it } from "vitest";
import {
  findDesignConsistencyAnomalies,
  findNegativeSpace,
  prioritizeTemporalInteraction,
} from "../src/index.js";

describe("hidden gameplay defect reasoning", () => {
  it("detects consumer-without-producer softlock risk", () => {
    const signals = findNegativeSpace({
      subjectId: "state:wave-ready",
      hasConsumer: true,
      hasProducer: false,
    });

    expect(signals[0]?.kind).toBe("consumer-without-producer");
  });

  it("prioritizes high-risk temporal intersections", () => {
    const risk = prioritizeTemporalInteraction({
      leftSystem: "reconnect",
      rightSystem: "respawn",
      factors: ["async", "reconnect", "delayed-callback"],
    });

    expect(risk.priority).toBe("high");
    expect(risk.windows).toEqual(["before", "overlap", "after"]);
  });

  it("flags a peer outlier without calling it a bug", () => {
    const result = findDesignConsistencyAnomalies([
      { subjectId: "arena:1", dimension: "session-capability", value: 1 },
      { subjectId: "arena:2", dimension: "session-capability", value: 1 },
      { subjectId: "arena:3", dimension: "session-capability", value: 0 },
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        subjectId: "arena:3",
        peerValue: 1,
        peerCount: 2,
      }),
    ]);
  });
});
