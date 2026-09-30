import { describe, expect, it } from "vitest";
import {
  createSpatialSemanticDiff,
} from "../src/spatial-diff.js";

describe("spatial semantic diff", () => {
  it("separates gameplay differences from decorative noise", () => {
    const report = createSpatialSemanticDiff(
      [
        { x: 0, y: 0, z: 0, blockIdentifier: "minecraft:stone" },
        { x: 5, y: 0, z: 0, blockIdentifier: "minecraft:grass_block" },
      ],
      [
        { x: 0, y: 0, z: 0, blockIdentifier: "minecraft:air" },
        { x: 5, y: 0, z: 0, blockIdentifier: "minecraft:dirt" },
      ],
      {
        semanticRegions: [
          {
            id: "player-route",
            min: { x: -1, y: -1, z: -1 },
            max: { x: 1, y: 2, z: 1 },
            relevance: "gameplay",
          },
          {
            id: "landscape",
            min: { x: 4, y: -1, z: -1 },
            max: { x: 6, y: 2, z: 1 },
            relevance: "decorative",
          },
        ],
      },
    );

    expect(report.gameplayDifferences).toBe(1);
    expect(report.decorativeDifferences).toBe(1);
  });
});
