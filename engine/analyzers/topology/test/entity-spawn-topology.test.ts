import { describe, expect, it } from "vitest";
import { deriveTopologyCandidates } from "../src/candidates.js";
import { detectLinearTopologyOutliers } from "../src/linear-outliers.js";
import type { ResolvedEffect } from "../src/effect-resolution.js";

describe("entity spawn topology", () => {
  it("groups translated spawn layouts and detects a coordinate outlier", () => {
    const effects: ResolvedEffect[] = [
      {
        kind: "entity-spawn",
        entityIdentifier: "minecraft:zombie",
        position: { x: 0, y: 64, z: 0 },
        sourcePath: "a",
      },
      {
        kind: "entity-spawn",
        entityIdentifier: "minecraft:zombie",
        position: { x: 100, y: 64, z: 0 },
        sourcePath: "b",
      },
      {
        kind: "entity-spawn",
        entityIdentifier: "minecraft:zombie",
        position: { x: 200, y: 64, z: 0 },
        sourcePath: "c",
      },
      {
        kind: "entity-spawn",
        entityIdentifier: "minecraft:zombie",
        position: { x: 350, y: 64, z: 0 },
        sourcePath: "d",
      },
      {
        kind: "entity-spawn",
        entityIdentifier: "minecraft:zombie",
        position: { x: 400, y: 64, z: 0 },
        sourcePath: "e",
      },
    ];

    const candidates = deriveTopologyCandidates(effects);
    expect(candidates).toEqual([
      expect.objectContaining({
        kind: "entity-spawn",
        evidenceCount: 5,
        confidence: "high",
      }),
    ]);

    const outliers = detectLinearTopologyOutliers(effects);
    expect(outliers).toEqual([
      expect.objectContaining({
        effectIndex: 3,
        axis: "x",
        expectedCoordinate: 300,
        actualCoordinate: 350,
        step: 100,
        sourcePath: "d",
      }),
    ]);
  });
});
