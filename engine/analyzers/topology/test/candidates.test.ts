import { describe, expect, it } from "vitest";
import { deriveTopologyCandidates } from "../src/candidates.js";
import { compareExpectedTranslation } from "../src/outliers.js";

const effects = [
  { kind: "fill" as const, from: {x:0,y:0,z:0}, to:{x:3,y:2,z:3}, block:"stone", sourcePath:"a" },
  { kind: "fill" as const, from: {x:100,y:0,z:0}, to:{x:103,y:2,z:3}, block:"stone", sourcePath:"b" },
  { kind: "fill" as const, from: {x:200,y:0,z:0}, to:{x:203,y:2,z:3}, block:"stone", sourcePath:"c" },
];

describe("topology candidates", () => {
  it("derives evidence-backed repeated groups", () => {
    const candidates = deriveTopologyCandidates(effects);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.confidence).toBe("medium");
    expect(candidates[0]?.members).toHaveLength(3);
  });

  it("detects translation outliers", () => {
    const result = compareExpectedTranslation(effects, 0, 1, {x:90,y:0,z:0});
    expect(result.status).toBe("outlier");
    expect(result.actual).toEqual({x:100,y:0,z:0});
  });
});
