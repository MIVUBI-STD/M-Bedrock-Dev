import { describe, expect, it } from "vitest";
import { analyzeManifest, manifestRuntimeEvidence } from "../src/index.js";

describe("manifest runtime evidence", () => {
  it("derives profile patch from declared engine and script modules", () => {
    const manifest = analyzeManifest({
      format_version: 2,
      header: {
        name: "Test",
        uuid: "00000000-0000-0000-0000-000000000001",
        version: [1, 0, 0],
        min_engine_version: [1, 21, 0],
      },
      modules: [{
        type: "script",
        uuid: "00000000-0000-0000-0000-000000000002",
        version: [1, 0, 0],
        entry: "scripts/main.js",
      }],
      dependencies: [{ module_name: "@minecraft/server", version: "2.0.0" }],
    }, { artifactId: "a", relativePath: "manifest.json" });

    const result = manifestRuntimeEvidence(manifest);
    expect(result.profilePatch.minecraftVersion).toBe("1.21.0");
    expect(result.profilePatch.scriptModules?.["@minecraft/server"]).toBe("2.0.0");
    expect(result.records.map((record) => record.predicate)).toContain(
      "script-module-dependencies-declared",
    );
  });
});