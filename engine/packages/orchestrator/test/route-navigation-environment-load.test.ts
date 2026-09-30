import { describe, expect, it } from "vitest";
import {
  parseRouteNavigationEnvironmentContracts,
} from "../src/route-navigation-environment-load.js";

describe("route navigation environment loader", () => {
  it("parses explicit route capability requirements", () => {
    expect(
      parseRouteNavigationEnvironmentContracts({
        contracts: [{
          id: "bridge-zombie",
          routeId: "bridge",
          entityKeys: ["demo:zombie"],
          medium: "ground",
          doorRequirement: "open",
          requiresWalking: true,
          avoidDamageBlocksRequired: true,
        }],
      }),
    ).toEqual([{
      id: "bridge-zombie",
      routeId: "bridge",
      entityKeys: ["demo:zombie"],
      medium: "ground",
      doorRequirement: "open",
      requiresWalking: true,
      avoidDamageBlocksRequired: true,
    }]);
  });

  it("rejects invalid capability enums", () => {
    expect(() =>
      parseRouteNavigationEnvironmentContracts([
        {
          id: "invalid",
          routeId: "bridge",
          medium: "lava",
        },
      ]),
    ).toThrow(/invalid medium/);
  });

  it("rejects contradictory water traversal policy", () => {
    expect(() =>
      parseRouteNavigationEnvironmentContracts([
        {
          id: "water-conflict",
          routeId: "river",
          medium: "water",
          avoidWaterRequired: true,
        },
      ]),
    ).toThrow(/avoid-water requirement conflict/);
  });
});
