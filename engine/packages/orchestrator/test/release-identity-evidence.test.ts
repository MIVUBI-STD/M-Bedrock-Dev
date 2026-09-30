import { describe, expect, it } from "vitest";
import {
  artifactFilenameReleaseObservation,
  extractExplicitReleaseVersion,
  levelNameReleaseObservation,
} from "../src/release-identity-evidence.js";

describe("release identity evidence", () => {
  it("extracts explicit v/version/release markers", () => {
    expect(
      extractExplicitReleaseVersion(
        "Beach Bedwars v1.0.4",
      ),
    ).toBe("1.0.4");
    expect(
      extractExplicitReleaseVersion(
        "Defense-version-2.1",
      ),
    ).toBe("2.1");
    expect(
      extractExplicitReleaseVersion(
        "Map release_3.0.0-beta.1",
      ),
    ).toBe("3.0.0-beta.1");
  });

  it("does not treat unrelated numbers as release identity", () => {
    expect(
      extractExplicitReleaseVersion(
        "Arena 6 Players 30",
      ),
    ).toBeUndefined();
    expect(
      extractExplicitReleaseVersion(
        "Minecraft 2026 Map",
      ),
    ).toBeUndefined();
  });

  it("creates filename and levelname observations", () => {
    expect(
      artifactFilenameReleaseObservation(
        "/tmp/The Gauntlet v1.0.1.mcworld",
      ),
    ).toMatchObject({
      component: "artifact-filename",
      releaseVersion: "1.0.1",
    });

    expect(
      levelNameReleaseObservation(
        "The Gauntlet v1.0.1",
        "art_123",
      ),
    ).toMatchObject({
      component: "levelname.txt",
      releaseVersion: "1.0.1",
      source: {
        artifactId: "art_123",
        relativePath: "levelname.txt",
      },
    });
  });
});
