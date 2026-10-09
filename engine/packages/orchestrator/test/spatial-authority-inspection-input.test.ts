import { describe, expect, it } from "vitest";
import {
  analyzeSpatialAuthorityCoverage,
} from "../src/inspection/spatial-authority-analysis.js";

describe("spatial authority inspection inputs", () => {
  it("resolves explicit requirements against authored regions and policy", () => {
    const result =
      analyzeSpatialAuthorityCoverage(
        [{
          id: "plot",
          role: "mutable",
          coordinateSpace: "absolute",
          volume: {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 10, y: 10, z: 10 },
          },
        }],
        {
          schemaVersion: 1,
          id: "policy",
          rules: [{
            id: "deny-observation-build",
            regionId: "plot",
            actor: "player",
            action: "place-block",
            phases: ["observation"],
            decision: "deny",
          }],
        },
        [{
          regionId: "plot",
          actor: "player",
          action: "place-block",
          phase: "observation",
        }],
      );

    expect(result).toMatchObject({
      policyValid: true,
      resolved: 1,
      uncovered: 0,
      conflicts: 0,
      unknownRegions: 0,
    });
    expect(result.assessments[0]).toMatchObject({
      status: "resolved",
      decision: "deny",
    });
  });
});
