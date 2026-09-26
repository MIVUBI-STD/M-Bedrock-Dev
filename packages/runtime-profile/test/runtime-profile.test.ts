import { describe, expect, it } from "vitest";
import {
  compareDottedNumericVersions,
  compareScriptSemver,
  validateMinecraftRuntimeProfile,
  type MinecraftRuntimeProfile,
} from "../src/index.js";

const profile: MinecraftRuntimeProfile = {
  schemaVersion: 2,
  product: {
    family: "bedrock-engine",
    edition: "education",
    version: "1.26.32",
  },
  host: "education-host",
  scriptModules: {
    "@minecraft/server": {
      version: "2.9.0",
      track: "stable",
    },
  },
  experiments: [],
  inventory: {
    scriptModules: "complete",
    experiments: "complete",
    worldSettings: "partial",
    packs: "partial",
  },
};

describe("runtime profile", () => {
  it("separates dotted product versions from Script API semver", () => {
    expect(compareDottedNumericVersions("1.26.32", "1.26.40")).toBe(-1);
    expect(compareScriptSemver("2.9.0", "2.9.0-beta.1")).toBe(1);
    expect(compareScriptSemver("2.10.0-beta.2", "2.10.0-beta.10")).toBe(-1);
  });

  it("validates an exact runtime identity independently from capability rules", () => {
    expect(validateMinecraftRuntimeProfile(profile)).toEqual([]);
  });

  it("rejects malformed module semver without guessing", () => {
    expect(validateMinecraftRuntimeProfile({
      ...profile,
      scriptModules: {
        "@minecraft/server": {
          version: "latest",
          track: "unknown",
        },
      },
    })).toContain(
      "Runtime profile script module version must be valid semver: @minecraft/server",
    );
  });
});
