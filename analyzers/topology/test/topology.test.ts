import { describe, expect, it } from "vitest";
import { resolveCoordinate3 } from "../src/coordinate-context.js";
import { findRepeatedTranslatedEffects } from "../src/repeated-groups.js";

describe("topology analysis", () => {
  it("resolves relative coordinates from an origin", () => {
    const resolved = resolveCoordinate3(
      {
        x: { mode: "relative", value: 2 },
        y: { mode: "absolute", value: 50 },
        z: { mode: "relative", value: -3 },
      },
      { origin: { x: 100, y: 64, z: 200 } },
    );
    expect(resolved).toEqual({ x: 102, y: 50, z: 197 });
  });

  it("finds translated copies of equivalent effects", () => {
    const pairs = findRepeatedTranslatedEffects([
      {
        kind: "fill",
        from: { x: 0, y: 0, z: 0 },
        to: { x: 3, y: 2, z: 3 },
        block: "stone",
        sourcePath: "a",
      },
      {
        kind: "fill",
        from: { x: 100, y: 0, z: 0 },
        to: { x: 103, y: 2, z: 3 },
        block: "stone",
        sourcePath: "b",
      },
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.translation).toEqual({ x: 100, y: 0, z: 0 });
  });
});
