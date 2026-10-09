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
} from "../src/inspection/inspect-source-index.js";

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
        unsupportedRelevantFiles: [],
        semanticUnderstandingGaps: [],
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

  it("indexes owned gameplay JSON definitions", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-index-"),
    );

    try {
      await mkdir(join(root, "loot_tables"), {
        recursive: true,
      });
      await mkdir(
        join(root, "behavior_packs", "bp", "items"),
        { recursive: true },
      );
      await mkdir(join(root, "recipes"), {
        recursive: true,
      });
      await writeFile(
        join(root, "loot_tables", "reward.json"),
        JSON.stringify({ pools: [] }),
        "utf8",
      );
      await writeFile(
        join(
          root,
          "behavior_packs",
          "bp",
          "items",
          "ready.json",
        ),
        JSON.stringify({
          format_version: "1.21.0",
          "minecraft:item": {
            description: {
              identifier: "test:ready",
            },
          },
        }),
        "utf8",
      );
      await writeFile(
        join(root, "recipes", "stick.json"),
        JSON.stringify({
          "minecraft:recipe_shaped": {
            description: {
              identifier: "test:stick",
            },
          },
        }),
        "utf8",
      );

      const files = [
        "loot_tables/reward.json",
        "behavior_packs/bp/items/ready.json",
        "recipes/stick.json",
      ].map((relativePath) => ({
        relativePath,
        size: 16,
        contentHash: relativePath,
      }));

      const result =
        await indexInspectionSources(
          root,
          "artifact:test",
          files,
        );

      expect(result.coverage).toMatchObject({
        relevantFiles: 3,
        indexedFiles: 3,
        complete: true,
      });
      expect(
        result.nodes.map((node) => node.kind),
      ).toEqual(
        expect.arrayContaining([
          "loot_table",
          "item",
          "recipe",
        ]),
      );
      expect(
        result.coverage.unsupportedRelevantFiles,
      ).toEqual([]);
      expect(
        result.coverage.semanticUnderstandingGaps,
      ).toEqual(files.map((item) => item.relativePath).sort());
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it("keeps gameplay JSON without a semantic owner as explicit residue", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-index-"),
    );

    try {
      await mkdir(join(root, "feature_rules"), {
        recursive: true,
      });
      await writeFile(
        join(root, "feature_rules", "ore.json"),
        JSON.stringify({}),
        "utf8",
      );

      const result =
        await indexInspectionSources(
          root,
          "artifact:test",
          [{
            relativePath:
              "feature_rules/ore.json",
            size: 2,
            contentHash: "feature",
          }],
        );

      expect(result.coverage).toMatchObject({
        relevantFiles: 1,
        indexedFiles: 0,
        complete: false,
      });
      expect(
        result.coverage.unsupportedRelevantFiles,
      ).toEqual([
        "feature_rules/ore.json",
      ]);
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it("does not classify resource-pack client item JSON as gameplay residue", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "m-bedrock-index-"),
    );

    try {
      await mkdir(
        join(root, "resource_packs", "visual", "items"),
        { recursive: true },
      );
      await writeFile(
        join(
          root,
          "resource_packs",
          "visual",
          "items",
          "client.json",
        ),
        JSON.stringify({}),
        "utf8",
      );

      const result =
        await indexInspectionSources(
          root,
          "artifact:test",
          [{
            relativePath:
              "resource_packs/visual/items/client.json",
            size: 2,
            contentHash: "client-item",
          }],
        );

      expect(
        result.coverage.unsupportedRelevantFiles,
      ).toEqual([]);
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
        unsupportedRelevantFiles: [],
        semanticUnderstandingGaps: [],
        complete: true,
      });
    } finally {
      await rm(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it("keeps malformed owned gameplay JSON as a parse failure, not indexed evidence", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-index-"));
    try {
      await mkdir(join(root, "behavior_packs", "bp", "items"), {
        recursive: true,
      });
      const relativePath = "behavior_packs/bp/items/broken.json";
      await writeFile(join(root, relativePath), "{ broken", "utf8");
      const result = await indexInspectionSources(root, "artifact:test", [{
        relativePath, size: 8, contentHash: "broken-item",
      }]);
      expect(result.coverage.relevantFiles).toBe(1);
      expect(result.coverage.indexedFiles).toBe(0);
      expect(result.coverage.complete).toBe(false);
      expect(result.coverage.parseFailures[0]).toMatchObject({
        relativePath, kind: "item",
      });
      expect(result.coverage.semanticUnderstandingGaps).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not treat resource-pack loot tables as behavior-pack gameplay", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-index-"));
    try {
      const relativePath = "resource_packs/visual/loot_tables/visual.json";
      await mkdir(join(root, "resource_packs", "visual", "loot_tables"), {
        recursive: true,
      });
      await writeFile(join(root, relativePath), JSON.stringify({ pools: [] }), "utf8");
      const result = await indexInspectionSources(root, "artifact:test", [{
        relativePath, size: 16, contentHash: "visual-only",
      }]);
      expect(result.coverage.relevantFiles).toBe(0);
      expect(result.coverage.unsupportedRelevantFiles).toEqual([]);
      expect(result.nodes).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("conserves unfamiliar behavior-pack JSON as an unsupported gameplay candidate", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-index-"));
    try {
      const relativePath = "behavior_packs/novel_bp/experimental_mechanic/device.json";
      await mkdir(join(root, "behavior_packs/novel_bp/experimental_mechanic"), { recursive: true });
      await writeFile(join(root, relativePath), JSON.stringify({ custom: { activation: "event" } }));
      const result = await indexInspectionSources(root, "artifact:test", [
        { relativePath, size: 34, contentHash: "novel" },
      ]);
      expect(result.coverage).toMatchObject({
        relevantFiles: 1,
        indexedFiles: 0,
        complete: false,
        unsupportedRelevantFiles: [relativePath],
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("accounts for vanilla tick registration without inventing a mechanic", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-index-"));
    const relativePath = "behavior_packs/bp/functions/tick.json";
    try {
      await mkdir(join(root, "behavior_packs/bp/functions"), { recursive: true });
      const file = { relativePath, size: 20, contentHash: "tick" };
      await writeFile(join(root, relativePath), '{"values":[]}');
      const empty = await indexInspectionSources(root, "artifact:test", [file]);
      expect(empty.coverage).toMatchObject({
        relevantFiles: 1, indexedFiles: 1, complete: true,
        unsupportedRelevantFiles: [],
      });
      await writeFile(join(root, relativePath), '{"values":["start"]}');
      const active = await indexInspectionSources(root, "artifact:test", [file]);
      expect(active.coverage).toMatchObject({
        relevantFiles: 1, indexedFiles: 1, complete: true,
        unsupportedRelevantFiles: [],
      });
      expect(active.tickFunctionRegistrations).toEqual([{
        source: { artifactId: "artifact:test", relativePath },
        functions: ["start"],
      }]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
