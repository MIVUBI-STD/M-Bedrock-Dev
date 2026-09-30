import { describe, expect, it } from "vitest";
import {
  analyzeStructureResidue,
} from "../src/structure-residue.js";

describe("structure residue analysis", () => {
  it("identifies cells where the next structure intentionally preserves prior blocks", () => {
    const report = analyzeStructureResidue(
      [
        { x: 0, y: 0, z: 0, mode: "replace" },
        { x: 1, y: 0, z: 0, mode: "replace" },
      ],
      [
        { x: 0, y: 0, z: 0, mode: "void" },
        { x: 1, y: 0, z: 0, mode: "air" },
      ],
    );

    expect(report.preservedByVoid).toBe(1);
    expect(report.explicitlyCleared).toBe(1);
  });
});
