import {
  describe,
  expect,
  it,
} from "vitest";
import {
  sourceRefHasPreciseLocation,
  sourceRefPrecision,
  validateSourceRef,
} from "../../src/project/source-ref.js";

describe("source ref precision", () => {
  it("recognizes line and json pointer precision", () => {
    expect(sourceRefPrecision({
      artifactId: "map",
      relativePath: "scripts/main.ts",
      range: { lineStart: 10, lineEnd: 12 },
    })).toBe("line");

    expect(sourceRefPrecision({
      artifactId: "map",
      relativePath: "entities/zombie.json",
      jsonPointer: "/minecraft:entity/components",
    })).toBe("json-pointer");
  });

  it("validates invalid source ranges", () => {
    expect(validateSourceRef({
      artifactId: "map",
      relativePath: "scripts/main.ts",
      range: { lineStart: 0, lineEnd: -1 },
    })).not.toEqual([]);
  });

  it("detects precise locations", () => {
    expect(sourceRefHasPreciseLocation({
      artifactId: "map",
      relativePath: "scripts/main.ts",
    })).toBe(false);
    expect(sourceRefHasPreciseLocation({
      artifactId: "map",
      relativePath: "scripts/main.ts",
      range: { lineStart: 1, lineEnd: 1 },
    })).toBe(true);
  });
});
