import { describe, expect, it } from "vitest";
import { parseArenaRegionContracts } from "../../src/arena/arena-region-contract-load.js";

describe("arena region contract loader", () => {
  it("parses compact contract documents", () => {
    const contracts = parseArenaRegionContracts({
      contracts: [{
        id: "build-plot",
        role: "mutable",
        coordinateSpace: "canonical-relative",
        volume: {
          min: { x: -12, y: 0, z: -12 },
          max: { x: 12, y: 40, z: 12 },
        },
      }],
    });

    expect(contracts[0]?.id).toBe("build-plot");
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      parseArenaRegionContracts([
        {
          id: "same",
          role: "mutable",
          coordinateSpace: "absolute",
          volume: {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 1, y: 1, z: 1 },
          },
        },
        {
          id: "same",
          role: "static",
          coordinateSpace: "absolute",
          volume: {
            min: { x: 2, y: 2, z: 2 },
            max: { x: 3, y: 3, z: 3 },
          },
        },
      ]),
    ).toThrow(/Duplicate/);
  });
});
