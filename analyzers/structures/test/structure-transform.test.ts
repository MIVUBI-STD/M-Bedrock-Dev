import { describe, expect, it } from "vitest";
import {
  transformStructureFootprint,
} from "../src/structure-transform.js";

describe("structure placement transform", () => {
  it("applies explicit pivot before mirror and rotation", () => {
    const result = transformStructureFootprint(
      [{ x: 2, y: 2, z: 1, mode: "replace" }],
      {
        origin: { x: 100, y: 50, z: 200 },
        pivot: { kind: "explicit", x: 1, z: 1 },
        mirror: "x",
        rotation: 90,
      },
    );

    expect(result).toEqual([
      { x: 101, y: 52, z: 200, mode: "replace" },
    ]);
  });

  it("supports bounds-center when the transformed lattice remains integral", () => {
    const result = transformStructureFootprint(
      [{ x: 0, y: 0, z: 0, mode: "replace" }],
      {
        origin: { x: 10, y: 0, z: 10 },
        pivot: {
          kind: "bounds-center",
          sizeX: 3,
          sizeZ: 3,
        },
        rotation: 90,
      },
    );

    expect(result[0]).toEqual({
      x: 12,
      y: 0,
      z: 10,
      mode: "replace",
    });
  });
});
