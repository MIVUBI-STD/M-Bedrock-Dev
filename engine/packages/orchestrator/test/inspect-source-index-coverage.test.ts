import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";
import {
  indexInspectionSources,
} from "../src/inspect-source-index.js";

describe("inspection source index coverage", () => {
  it("marks recognized source coverage incomplete when a relevant entity cannot be parsed", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-index-"),
    );

    try {
      await mkdir(join(root, "functions"), {
        recursive: true,
      });
      await mkdir(join(root, "entities"), {
        recursive: true,
      });

      await writeFile(
        join(root, "functions", "start.mcfunction"),
        "say hello\n",
        "utf8",
      );
      await writeFile(
        join(root, "entities", "broken.json"),
        "{ broken",
        "utf8",
      );

      const result =
        await indexInspectionSources(
          root,
          "artifact:test",
          [{
            relativePath:
              "functions/start.mcfunction",
            size: 10,
            contentHash: "fn",
          }, {
            relativePath:
              "entities/broken.json",
            size: 8,
            contentHash: "entity",
          }],
        );

      expect(result.coverage).toMatchObject({
        relevantFiles: 2,
        indexedFiles: 1,
        complete: false,
      });
      expect(
        result.coverage.parseFailures,
      ).toHaveLength(1);
      expect(
        result.coverage.parseFailures[0],
      ).toMatchObject({
        relativePath: "entities/broken.json",
        kind: "entity",
      });
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it("includes dialogue and localized text in discovery coverage", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-index-"),
    );

    try {
      await mkdir(join(root, "dialogue"), {
        recursive: true,
      });
      await mkdir(join(root, "texts"), {
        recursive: true,
      });

      await writeFile(
        join(root, "dialogue", "npc.json"),
        JSON.stringify({
          format_version: "1.17",
          minecraft_npc_dialogue: {
            scenes: [{
              scene_tag: "entry",
              npc_name: "Guide",
              text: "Start the match",
            }],
          },
        }),
        "utf8",
      );
      await writeFile(
        join(root, "texts", "en_US.lang"),
        "ui.start=Start Match\n",
        "utf8",
      );

      const result =
        await indexInspectionSources(
          root,
          "artifact:test",
          [{
            relativePath: "dialogue/npc.json",
            size: 100,
            contentHash: "dialogue",
          }, {
            relativePath: "texts/en_US.lang",
            size: 20,
            contentHash: "lang",
          }],
        );

      expect(result.coverage).toEqual({
        relevantFiles: 2,
        indexedFiles: 2,
        parseFailures: [],
        complete: true,
      });
      expect(
        result.parsedDialogueDocuments,
      ).toHaveLength(1);
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it("marks malformed dialogue as a discovery coverage failure", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-index-"),
    );

    try {
      await mkdir(join(root, "dialogue"), {
        recursive: true,
      });
      await writeFile(
        join(root, "dialogue", "broken.json"),
        "{ broken",
        "utf8",
      );

      const result =
        await indexInspectionSources(
          root,
          "artifact:test",
          [{
            relativePath:
              "dialogue/broken.json",
            size: 8,
            contentHash: "broken",
          }],
        );

      expect(result.coverage.complete).toBe(false);
      expect(
        result.coverage.parseFailures[0],
      ).toMatchObject({
        relativePath:
          "dialogue/broken.json",
        kind: "dialogue",
      });
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it("reports complete coverage for fully indexed recognized sources", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-index-"),
    );

    try {
      await mkdir(join(root, "functions"), {
        recursive: true,
      });
      await writeFile(
        join(root, "functions", "start.mcfunction"),
        "say hello\n",
        "utf8",
      );

      const result =
        await indexInspectionSources(
          root,
          "artifact:test",
          [{
            relativePath:
              "functions/start.mcfunction",
            size: 10,
            contentHash: "fn",
          }],
        );

      expect(result.coverage).toEqual({
        relevantFiles: 1,
        indexedFiles: 1,
        parseFailures: [],
        complete: true,
      });
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
