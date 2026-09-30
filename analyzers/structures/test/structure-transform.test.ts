import { describe, expect, it } from "vitest";
import {
  transformStructureFootprint,
} from "../src/structure-transform.js";

describe("structure placement transform", () => {
  it("applies mirror, rotation, and placement origin deterministically", () => {
    const result = transformStructureFootprint(
      [{ x: 1, y: 2, z: 3, mode: "replace" }],
      {
        origin: { x: 100, y: 50, z: 200 },
        mirror: "x",
        rotation: 90,
      },
    );

    expect(result).toEqual([
      { x: 97, y: 52, z: 199, mode: "replace" },
    ]);
  });
});
