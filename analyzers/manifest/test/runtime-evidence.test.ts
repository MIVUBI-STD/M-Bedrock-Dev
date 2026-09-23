import { describe, expect, it } from "vitest";
import { analyzeManifest, manifestRuntimeEvidence, resolveKnowledgeProfile } from "../src/index.js";

describe("manifest runtime evidence", () => {
  it("keeps manifest constraints separate from actual runtime profile", () => {
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
    expect(result.declaredMinEngineVersion).toBe("1.21.0");
    expect(result.manifestFormatVersion).toBe("2");
    expect(result.scriptModules["@minecraft/server"]).toBe("2.0.0");
    expect(result.records.map((record) => record.predicate)).toContain(
      "script-module-dependencies-declared",
    );
  });

  it("resolves runtime version from project session, not min_engine_version", () => {
    const manifest = analyzeManifest({
      format_version: 2,
      header: {
        uuid: "00000000-0000-0000-0000-000000000001",
        version: [1, 0, 0],
        min_engine_version: [1, 20, 0],
      },
      modules: [],
      dependencies: [{ module_name: "@minecraft/server", version: "2.0.0" }],
    }, { artifactId: "a", relativePath: "manifest.json" });

    const resolution = resolveKnowledgeProfile({
      projectId: "p",
      sourceArtifactId: "a",
      sourceFingerprint: "f",
      targetEdition: "bedrock",
      targetVersion: "1.21.130",
      workingRevision: 1,
      indexRevision: 1,
    }, [manifest]);

    expect(resolution.profile?.minecraftVersion).toBe("1.21.130");
    expect(resolution.profile?.scriptModules?.["@minecraft/server"]).toBe("2.0.0");
    expect(resolution.conflicts).toEqual([]);
  });
});