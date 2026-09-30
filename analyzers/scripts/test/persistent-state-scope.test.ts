import { describe, expect, it } from "vitest";
import {
  inferPersistentStateScopes,
} from "../src/persistent-state-scope.js";

describe("persistent state scope inference", () => {
  it("prefers receiver evidence over naming heuristics", () => {
    const result = inferPersistentStateScopes([
      {
        operation: "set",
        propertyId: "lastMatch",
        receiverHint: "player",
        source: {
          artifactId: "artifact:test",
          relativePath: "scripts/main.ts",
        },
      },
    ]);

    expect(result[0]).toEqual(
      expect.objectContaining({
        scope: "player",
        confidence: "exact-receiver",
      }),
    );
  });

  it("keeps ambiguous properties unknown", () => {
    const result = inferPersistentStateScopes([
      {
        operation: "get",
        propertyId: "data",
        receiverHint: "manager",
        source: {
          artifactId: "artifact:test",
          relativePath: "scripts/main.ts",
        },
      },
    ]);

    expect(result[0]?.scope).toBe("unknown");
  });
});
