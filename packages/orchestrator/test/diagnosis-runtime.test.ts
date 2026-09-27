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
  runBuiltinDiagnosis,
} from "../src/diagnosis-runtime.js";

describe("built-in diagnosis runtime", () => {
  it("runs source indexing then semantic IR without caller-managed intermediate payloads", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-builtin-"),
    );

    try {
      await mkdir(join(root, "functions"), {
        recursive: true,
      });
      await writeFile(
        join(root, "functions", "start.mcfunction"),
        "scoreboard players set @s ready 1\n",
        "utf8",
      );

      const result =
        await runBuiltinDiagnosis({
          goal: "semantic-consistency",
          relevantTags: ["state"],
          context: "LOCAL_ARTIFACT",
          artifact: {
            root,
            artifactId: "artifact:test",
            files: [{
              relativePath:
                "functions/start.mcfunction",
              size: 32,
              contentHash: "hash-start",
            }],
          },
        });

      expect(result.status).toBe(
        "sufficient",
      );
      expect(
        result.executions.map(
          (item) => item.capabilityId,
        ),
      ).toEqual([
        "diagnosis.source-index",
        "diagnosis.semantic-ir",
      ]);
      expect(
        result.outputs[
          "diagnosis.semantic-ir"
        ],
      ).toBeDefined();
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it("stops at source indexing when recognized source coverage is incomplete", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-builtin-"),
    );

    try {
      await mkdir(join(root, "entities"), {
        recursive: true,
      });
      await writeFile(
        join(root, "entities", "broken.json"),
        "{ broken",
        "utf8",
      );

      const result =
        await runBuiltinDiagnosis({
          goal: "semantic-consistency",
          relevantTags: ["state"],
          context: "LOCAL_ARTIFACT",
          artifact: {
            root,
            artifactId: "artifact:test",
            files: [{
              relativePath:
                "entities/broken.json",
              size: 8,
              contentHash: "hash-broken",
            }],
          },
        });

      expect(result.status).toBe(
        "blocked",
      );
      expect(result.executions)
        .toHaveLength(1);
      expect(result.reasons.join(" "))
        .toMatch(/coverage is incomplete/);
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it("refuses runtime-behavior claims from artifact-only context before invoking any executor", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-builtin-"),
    );

    try {
      const result =
        await runBuiltinDiagnosis({
          goal: "runtime-behavior",
          relevantTags: ["session"],
          context: "LOCAL_ARTIFACT",
          artifact: {
            root,
            artifactId: "artifact:test",
            files: [],
          },
        });

      expect(result.status).toBe(
        "requires-runtime-context",
      );
      expect(result.executions)
        .toEqual([]);
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
