import { describe, expect, it } from "vitest";
import {
  placedWorldCoordinate,
  transformStructureCoordinate,
} from "../src/placement-transform.js";

describe("structure placement transform", () => {
  it("rotates local coordinates around the structure origin", () => {
    expect(transformStructureCoordinate(
      { x: 1, y: 0, z: 0 },
      { x: 3, y: 1, z: 2 },
      { rotation: "90_degrees", mirror: "none" },
    )).toEqual({ x: 1, y: 0, z: 1 });
  });

  it("maps transformed local coordinates into world coordinates", () => {
    expect(placedWorldCoordinate(
      { x: 0, y: 2, z: 1 },
      { x: 2, y: 4, z: 3 },
      { x: 100, y: 64, z: -20 },
      { rotation: "0_degrees", mirror: "x" },
    )).toEqual({ x: 101, y: 66, z: -19 });
  });
});
