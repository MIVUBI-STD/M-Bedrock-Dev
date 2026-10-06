import { describe, expect, it } from "vitest";
import {
  parseSpatialAuthorityBehaviorContract,
} from "../../src/inspection/spatial-authority-contract-load.js";

describe("spatial authority contract parser", () => {
  it("normalizes a valid contract without inventing defaults", () => {
    expect(
      parseSpatialAuthorityBehaviorContract({
        schemaVersion: 1,
        id: "blitz-build",
        rules: [
          {
            id: "build-plot-place",
            regionId: "build-plot",
            actor: "player",
            action: "place-block",
            phases: ["building", "building"],
            decision: "allow",
          },
        ],
      }),
    ).toEqual({
      schemaVersion: 1,
      id: "blitz-build",
      rules: [
        {
          id: "build-plot-place",
          regionId: "build-plot",
          actor: "player",
          action: "place-block",
          phases: ["building"],
          decision: "allow",
        },
      ],
    });
  });

  it("accepts system block-mutation authority without aliasing it to player break-block", () => {
    const parsed = parseSpatialAuthorityBehaviorContract({
      schemaVersion: 1,
      id: "hazard-policy",
      rules: [{
        id: "system-hazard-mutation",
        regionId: "arena",
        actor: "system",
        action: "mutate-blocks",
        decision: "allow",
      }],
    });
    expect(parsed.rules[0]?.action).toBe("mutate-blocks");
  });

  it("rejects duplicate rule ids at the parser boundary", () => {
    expect(() =>
      parseSpatialAuthorityBehaviorContract({
        schemaVersion: 1,
        id: "duplicate",
        rules: [
          {
            id: "same",
            regionId: "build-plot",
            actor: "player",
            action: "place-block",
            decision: "allow",
          },
          {
            id: "same",
            regionId: "lobby",
            actor: "player",
            action: "place-block",
            decision: "deny",
          },
        ],
      }),
    ).toThrow(/Duplicate spatial authority rule id/);
  });

  it("rejects unknown actions instead of silently accepting typos", () => {
    expect(() =>
      parseSpatialAuthorityBehaviorContract({
        schemaVersion: 1,
        id: "invalid",
        rules: [
          {
            id: "bad-action",
            regionId: "build-plot",
            actor: "player",
            action: "placeblock",
            decision: "allow",
          },
        ],
      }),
    ).toThrow(/invalid action/);
  });
});
