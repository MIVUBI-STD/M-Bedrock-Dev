import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  indexAuthoredIntentSources,
} from "../src/inspect-authored-intent-source.js";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("authored intent source indexing", () => {
  it("indexes behavior-pack src TypeScript without treating runtime scripts as authored source", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-authored-intent-"),
    );
    roots.push(root);

    await mkdir(
      join(root, "behavior_packs/demo/src/domain"),
      { recursive: true },
    );
    await mkdir(
      join(root, "behavior_packs/demo/scripts/domain"),
      { recursive: true },
    );

    await writeFile(
      join(
        root,
        "behavior_packs/demo/src/domain/types.ts",
      ),
      `
export interface ResourceRecord {
  owner: SessionToken;
}
export interface SessionToken {
  sessionId: string;
  generation: number;
}
`,
      "utf8",
    );

    await writeFile(
      join(
        root,
        "behavior_packs/demo/scripts/domain/types.js",
      ),
      "export {};",
      "utf8",
    );

    const result = await indexAuthoredIntentSources(
      root,
      "art_test",
      [
        {
          relativePath:
            "behavior_packs/demo/src/domain/types.ts",
          size: 100,
          kindHint: "script",
        },
        {
          relativePath:
            "behavior_packs/demo/scripts/domain/types.js",
          size: 10,
          kindHint: "script",
        },
      ],
    );

    expect(result).toHaveLength(1);
    expect(
      result[0]?.parsed.source.relativePath,
    ).toBe(
      "behavior_packs/demo/src/domain/types.ts",
    );
    expect(
      result[0]?.parsed.typeProperties?.some(
        (item) =>
          item.containerName === "ResourceRecord" &&
          item.propertyName === "owner" &&
          item.typeText === "SessionToken",
      ),
    ).toBe(true);
  });
});
