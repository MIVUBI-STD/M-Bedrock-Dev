import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";
import {
  join,
} from "node:path";
import {
  tmpdir,
} from "node:os";
import {
  describe,
  expect,
  it,
} from "vitest";
import {
  buildFilesystemInventory,
} from "../../project-model/src/index.js";
import {
  indexInspectionSources,
} from "../src/inspection/inspect-source-index.js";

describe("inspection source content identity", () => {
  it("binds semantic source nodes to file content hashes", async () => {
    const root =
      await mkdtemp(
        join(
          tmpdir(),
          "m-bedrock-content-hash-",
        ),
      );

    try {
      await mkdir(
        join(root, "functions"),
        { recursive: true },
      );
      await writeFile(
        join(
          root,
          "functions",
          "arena.mcfunction",
        ),
        "say first\n",
        "utf8",
      );

      const firstFiles =
        await buildFilesystemInventory(
          root,
        );
      const first =
        await indexInspectionSources(
          root,
          "artifact",
          firstFiles,
        );
      const firstNode =
        first.nodes.find(
          (node) =>
            node.identifier ===
            "arena",
        );

      await writeFile(
        join(
          root,
          "functions",
          "arena.mcfunction",
        ),
        "say second\n",
        "utf8",
      );

      const secondFiles =
        await buildFilesystemInventory(
          root,
        );
      const second =
        await indexInspectionSources(
          root,
          "artifact",
          secondFiles,
        );
      const secondNode =
        second.nodes.find(
          (node) =>
            node.identifier ===
            "arena",
        );

      expect(
        firstNode?.contentHash,
      ).toBeTruthy();
      expect(
        firstNode?.parserVersion,
      ).toBe(
        "m-bedrock-function-parser:1",
      );
      expect(
        secondNode?.contentHash,
      ).toBeTruthy();
      expect(
        firstNode?.contentHash,
      ).not.toBe(
        secondNode?.contentHash,
      );
    } finally {
      await rm(
        root,
        {
          recursive: true,
          force: true,
        },
      );
    }
  });
});
