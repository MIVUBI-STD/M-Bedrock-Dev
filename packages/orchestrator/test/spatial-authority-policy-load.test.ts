import { describe, expect, it } from "vitest";
import {
  parseSpatialAuthorityPolicy,
} from "../src/spatial-authority-policy-load.js";

describe("spatial authority policy parser", () => {
  it("normalizes a valid policy without inventing defaults", () => {
    expect(
      parseSpatialAuthorityPolicy({
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

  it("rejects duplicate rule ids at the parser boundary", () => {
    expect(() =>
      parseSpatialAuthorityPolicy({
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
      parseSpatialAuthorityPolicy({
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
