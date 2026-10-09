import { describe, expect, it } from "vitest";
import {
  inferPersistentStateLifetimes,
} from "../../../src/domains/persistence/persistent-state-lifetime.js";

describe("persistent state lifetime", () => {
  it("does not infer player-session lifetime from a player dynamic-property receiver", () => {
    const result = inferPersistentStateLifetimes(
      [{
        propertyKey: "reconnectPhase", variable: "phase",
        reads: 1, appends: 0, writes: 1, clears: 0,
        growth: "no-append",
        source: { artifactId: "artifact:test", relativePath: "scripts/main.ts" },
      }],
      [{
        propertyId: "reconnectPhase", scope: "player",
        confidence: "exact-receiver", reasons: ["player receiver"],
      }],
      [],
    );
    expect(result[0]?.lifetime).toBe("unknown");
    expect(result[0]?.confidence).toBe("unknown");
    expect(result[0]?.reasons.join(" ")).toContain("not connection-session lifetime");
  });


  it("does not infer round or match lifetime from unrelated resource cleanup labels", () => {
    const source = { artifactId: "artifact:test", relativePath: "scripts/main.ts" };
    const result = inferPersistentStateLifetimes(
      [{
        propertyKey: "savedProgress",
        variable: "progress",
        reads: 1, appends: 1, writes: 1, clears: 1,
        growth: "append-with-clear", source,
      }],
      [{
        propertyId: "savedProgress", scope: "world",
        confidence: "exact-receiver", reasons: ["world receiver"],
      }],
      [{
        surface: "tag", action: "release", key: "player:ready",
        precision: "exact", executionRegion: "function:cleanupRound",
        source,
      }],
    );
    expect(result[0]?.lifetime).toBe("unknown");
    expect(result[0]?.confidence).toBe("unknown");
  });

  it("identifies world-lifetime growth when world state appends without cleanup", () => {
    const result = inferPersistentStateLifetimes(
      [{
        propertyKey: "history",
        variable: "history",
        reads: 1,
        appends: 1,
        writes: 1,
        clears: 0,
        growth: "append-without-clear",
        source: {
          artifactId: "artifact:test",
          relativePath: "scripts/main.ts",
        },
      }],
      [{
        propertyId: "history",
        scope: "world",
        confidence: "exact-receiver",
        reasons: ["world receiver"],
      }],
      [],
    );

    expect(result[0]?.lifetime).toBe("world");
  });
});
