import { describe, expect, it } from "vitest";
import {
  inferPersistentStateScopes,
} from "../../../src/domains/persistence/persistent-state-scope.js";

describe("persistent state scope inference", () => {
  it("lets recognized world receiver outrank a round/arena key name", () => {
    const result = inferPersistentStateScopes([{
      operation: "set", propertyId: "arenaRoundState",
      receiverHint: "world",
      source: { artifactId: "a", relativePath: "scripts/main.ts" },
    }]);
    expect(result[0]).toMatchObject({
      scope: "world", confidence: "exact-receiver",
    });
  });

  it("keeps same literal key across player/world owners unresolved", () => {
    const source = { artifactId: "a", relativePath: "scripts/main.ts" };
    const result = inferPersistentStateScopes([
      { operation: "get", propertyId: "roundState",
        receiverHint: "world", source },
      { operation: "set", propertyId: "roundState",
        receiverHint: "player", source },
    ]);
    expect(result[0]).toMatchObject({
      scope: "unknown", confidence: "unknown",
    });
  });

  it("does not turn an unidentified receiver into an exact mixed ownership proof", () => {
    const source = { artifactId: "a", relativePath: "scripts/main.ts" };
    const result = inferPersistentStateScopes([
      { operation: "get", propertyId: "matchState",
        receiverHint: "world", source },
      { operation: "set", propertyId: "matchState",
        receiverHint: "manager", source },
    ]);
    expect(result[0]?.scope).toBe("unknown");
    expect(result[0]?.confidence).toBe("unknown");
  });


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
