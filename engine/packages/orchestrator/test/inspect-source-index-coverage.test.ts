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
