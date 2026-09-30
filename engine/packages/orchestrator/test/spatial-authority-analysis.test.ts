import { describe, expect, it } from "vitest";
import {
  analyzeSpatialAuthorityCoverage,
} from "../src/spatial-authority-analysis.js";

const regions = [
  {
    id: "build-plot",
    role: "mutable" as const,
    coordinateSpace: "absolute" as const,
    volume: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 10, y: 10, z: 10 },
    },
  },
  {
    id: "lobby",
    role: "static" as const,
    coordinateSpace: "absolute" as const,
    volume: {
      min: { x: 20, y: 0, z: 0 },
      max: { x: 30, y: 10, z: 10 },
    },
  },
];

describe("spatial authority coverage", () => {
  it("reports covered and uncovered gameplay authority requirements separately", () => {
    const result = analyzeSpatialAuthorityCoverage(
      regions,
      {
        schemaVersion: 1,
        id: "arena-policy",
        rules: [
          {
            id: "build-only-during-building",
            regionId: "build-plot",
            actor: "player",
            action: "place-block",
            phases: ["building"],
            decision: "allow",
          },
          {
            id: "deny-lobby-mutation",
            regionId: "lobby",
            actor: "player",
            action: "break-block",
            decision: "deny",
          },
        ],
      },
      [
        {
          regionId: "build-plot",
          actor: "player",
          action: "place-block",
          phase: "building",
        },
        {
          regionId: "build-plot",
          actor: "player",
          action: "use-item",
          phase: "building",
        },
      ],
    );

    expect(result).toMatchObject({
      policyValid: true,
      resolved: 1,
      uncovered: 1,
      conflicts: 0,
      unknownRegions: 0,
    });
  });

  it("rejects policy references to unknown region contracts", () => {
    const result = analyzeSpatialAuthorityCoverage(
      regions,
      {
        schemaVersion: 1,
        id: "bad-policy",
        rules: [
          {
            id: "ghost-rule",
            regionId: "missing-region",
            actor: "player",
            action: "place-block",
            decision: "deny",
          },
        ],
      },
      [],
    );

    expect(result.policyValid).toBe(false);
    expect(result.referencedUnknownRegions).toEqual([
      "missing-region",
    ]);
  });
});
