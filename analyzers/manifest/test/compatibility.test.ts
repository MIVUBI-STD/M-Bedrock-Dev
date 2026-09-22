import { describe, expect, it } from "vitest";
import { analyzeManifest } from "../src/analyze.js";
import { deriveManifestCompatibilityFacts } from "../src/compatibility.js";

describe("manifest compatibility facts", () => {
  it("derives min engine and script dependency track without owning compatibility policy", () => {
    const source = { artifactId: "art_demo", relativePath: "manifest.json" };
    const manifest = analyzeManifest({
      format_version: 2,
      header: {
        name: "Demo",
        uuid: "00000000-0000-0000-0000-000000000001",
        version: [1, 0, 0],
        min_engine_version: [1, 21, 40],
      },
      modules: [{
        type: "script",
        uuid: "00000000-0000-0000-0000-000000000002",
        version: [1, 0, 0],
        entry: "scripts/main.js",
      }],
      dependencies: [{
        module_name: "@minecraft/server",
        version: "2.0.0-beta",
      }],
      has_education_metadata: true,
    }, source);

    const facts = deriveManifestCompatibilityFacts(manifest);

    expect(facts.minEngineVersion).toEqual({ major: 1, minor: 21, patch: 40 });
    expect(facts.scriptModules[0]?.track).toBe("beta");
    expect(facts.educationMetadata).toBe(true);
  });
});
