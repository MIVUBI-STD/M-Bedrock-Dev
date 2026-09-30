import { describe, expect, it } from "vitest";
import {
  inferPersistentStateLifetimes,
} from "../src/persistent-state-lifetime.js";

describe("persistent state lifetime", () => {
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
