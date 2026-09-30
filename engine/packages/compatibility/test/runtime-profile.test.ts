import { describe, expect, it } from "vitest";
import {
  capabilityQueryFromRuntimeProfile,
} from "../src/index.js";
import type {
  MinecraftRuntimeProfile,
} from "../../runtime-profile/src/index.js";

describe("runtime profile compatibility bridge", () => {
  it("maps richer runtime identity into the legacy capability engine without losing edition", () => {
    const profile: MinecraftRuntimeProfile = {
      schemaVersion: 2,
      product: {
        family: "bedrock-engine",
        edition: "education",
        version: "1.26.32",
      },
      host: "education-host",
      scriptModules: {},
      experiments: ["Beta APIs"],
      inventory: {
        scriptModules: "unknown",
        experiments: "complete",
        worldSettings: "unknown",
        packs: "unknown",
      },
    };

    expect(capabilityQueryFromRuntimeProfile(profile)).toEqual({
      edition: "education",
      gameVersion: {
        major: 1,
        minor: 26,
        patch: 32,
      },
      experiments: ["Beta APIs"],
    });
  });
});
