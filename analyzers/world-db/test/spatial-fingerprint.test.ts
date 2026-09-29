import { describe, expect, it } from "vitest";
import {
  compareSpatialFingerprints,
  createSpatialFingerprint,
} from "../src/spatial-fingerprint.js";

describe("spatial fingerprint", () => {
  it("is invariant to arena translation when origins are translated too", () => {
    const a = createSpatialFingerprint(
      [
        { x: 10, y: 20, z: 30, blockIdentifier: "minecraft:stone" },
        { x: 11, y: 20, z: 30, blockIdentifier: "minecraft:oak_planks" },
      ],
      { origin: { x: 10, y: 20, z: 30 } },
    );
    const b = createSpatialFingerprint(
      [
        { x: 510, y: 20, z: -470, blockIdentifier: "minecraft:stone" },
        { x: 511, y: 20, z: -470, blockIdentifier: "minecraft:oak_planks" },
      ],
      { origin: { x: 510, y: 20, z: -470 } },
    );

    expect(compareSpatialFingerprints(a, b).equal).toBe(true);
  });

  it("localizes differences to buckets", () => {
    const a = createSpatialFingerprint([
      { x: 0, y: 0, z: 0, blockIdentifier: "minecraft:stone" },
      { x: 20, y: 0, z: 0, blockIdentifier: "minecraft:stone" },
    ]);
    const b = createSpatialFingerprint([
      { x: 0, y: 0, z: 0, blockIdentifier: "minecraft:stone" },
      { x: 20, y: 0, z: 0, blockIdentifier: "minecraft:dirt" },
    ]);

    const comparison = compareSpatialFingerprints(a, b);
    expect(comparison.equal).toBe(false);
    expect(comparison.differingBuckets).toEqual(["1,0,0"]);
  });

  it("supports known mutable volumes without contaminating fidelity proof", () => {
    const fingerprint = createSpatialFingerprint(
      [
        { x: 0, y: 0, z: 0, blockIdentifier: "minecraft:stone" },
        { x: 5, y: 0, z: 0, blockIdentifier: "minecraft:gold_block" },
      ],
      {
        ignoredVolumes: [
          { min: { x: 4, y: -1, z: -1 }, max: { x: 6, y: 1, z: 1 } },
        ],
      },
    );

    expect(fingerprint.sampleCount).toBe(1);
    expect(fingerprint.ignoredSampleCount).toBe(1);
  });
});
