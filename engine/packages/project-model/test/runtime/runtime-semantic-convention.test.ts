import { describe, expect, it } from "vitest";
import { validateRuntimeSemanticAttributes } from "../../src/index.js";

describe("runtime semantic convention", () => {
  it("validates canonical identity/generation attributes", () => {
    expect(validateRuntimeSemanticAttributes({
      "map.id": "map-a",
      "arena.id": "arena-1",
      "arena.generation": 3,
      "event.sequence": 8,
    }, true)).toEqual([]);
  });

  it("rejects legacy names in strict mode", () => {
    expect(validateRuntimeSemanticAttributes({ "arenaId": "legacy" }, true)).toEqual([
      "Unknown runtime semantic attribute: arenaId",
    ]);
  });
});
