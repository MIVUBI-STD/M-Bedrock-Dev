import { describe, expect, it } from "vitest";
import { analyzeManifest, classifyPackFromManifest } from "../src/analyze.js";

describe("manifest analyzer", () => {
  const source = { artifactId: "art_demo", relativePath: "behavior_packs/demo/manifest.json" };

  it("normalizes pack identity and module types", () => {
    const manifest = analyzeManifest(
      {
        format_version: 2,
        header: {
          name: "Demo",
          uuid: "00000000-0000-0000-0000-000000000001",
          version: [1, 0, 0],
        },
        modules: [
          {
            type: "data",
            uuid: "00000000-0000-0000-0000-000000000002",
            version: [1, 0, 0],
          },
        ],
      },
      source,
    );

    expect(classifyPackFromManifest(manifest)).toBe("behavior_pack");
    expect(manifest.headerUuid).toBe("00000000-0000-0000-0000-000000000001");
  });
});
