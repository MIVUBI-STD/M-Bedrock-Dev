import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectDirectory } from "../../src/inspection/inspect.js";
import { discoverInspectionPacks } from "../../src/inspection/inspect-packs.js";
import { buildFilesystemInventory } from "../../../project-model/src/index.js";

describe("inspectDirectory", () => {
  it("discovers pack, functions, structures and unresolved references", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-inspect-"));
    const pack = join(root, "behavior_packs/demo");

    await mkdir(join(pack, "functions"), { recursive: true });
    await mkdir(join(pack, "structures"), { recursive: true });

    await writeFile(join(pack, "manifest.json"), JSON.stringify({
      format_version: 2,
      header: {
        name: "Demo",
        description: "Demo",
        uuid: "00000000-0000-0000-0000-000000000001",
        version: [1,0,0]
      },
      modules: [{
        type: "data",
        uuid: "00000000-0000-0000-0000-000000000002",
        version: [1,0,0]
      }]
    }));

    await writeFile(join(pack, "functions/start.mcfunction"), [
      "function missing/reset",
      "structure load arena/test 0 0 0",
    ].join("\n"));

    await writeFile(join(pack, "structures/test.mcstructure"), "fixture");

    const result = await inspectDirectory(root);
    expect(result.packs[0]?.type).toBe("behavior_pack");
    expect(result.functions).toBe(1);
    expect(result.structures).toBe(1);
    expect(result.unresolvedReferences).toBeGreaterThan(0);
    expect(result.semanticIr.executionRegions).toBeGreaterThan(0);
    expect(result.semanticIr.executionEdges).toBeGreaterThan(0);
    expect(result.semanticIr.unresolvedExecutionTargets).toBeGreaterThan(0);
    expect(result.decisionBasis.semanticIrRevision).toMatch(/^[a-f0-9]{64}$/);
  });
  it("keeps duplicate function targets unresolved for Discovery Closure", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-ambiguous-"));
    try {
      for (const pack of ["a", "b"]) {
        const dir = join(root, "behavior_packs", pack, "functions");
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, "start.mcfunction"), "say ready\\n");
      }
      await writeFile(join(root, "behavior_packs", "a", "functions", "tick.json"),
        JSON.stringify({ values: ["start"] }));
      const result = await inspectDirectory(root);
      expect(result.gameplayDiscoveryClosure.unresolvedReferences).toBeGreaterThan(0);
      expect(result.unresolvedReferences).toBe(result.gameplayDiscoveryClosure.unresolvedReferences);
      expect(result.gameplayDiscoveryClosure.status).not.toBe("COMPLETE");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not treat an icon-only unlisted pack as gameplay source", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-icon-only-"));
    try {
      for (const name of ["a", "b"]) {
        await mkdir(join(root, "behavior_packs", name, "functions"), { recursive: true });
        await writeFile(join(root, "behavior_packs", name, "manifest.json"), JSON.stringify({
          format_version: 2,
          header: { name, uuid: name === "a" ? "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" : "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", version: [1,0,0] },
          modules: [{ type: "data", uuid: "cccccccc-cccc-cccc-cccc-cccccccccccc", version: [1,0,0] }],
        }));
      }
      await writeFile(join(root, "world_behavior_packs.json"), JSON.stringify([
        { pack_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", version: [1,0,0] },
      ]));
      await writeFile(join(root, "behavior_packs/b/pack_icon.png"), "icon");
      await writeFile(join(root, "behavior_packs/a/functions/start.mcfunction"), "say ready");
      const withoutSource = await inspectDirectory(root);
      expect(withoutSource.gameplayDiscoveryClosure.unlistedPackRoots).toEqual([]);
      await writeFile(join(root, "behavior_packs/b/functions/start.mcfunction"), "say ready");
      const withSource = await inspectDirectory(root);
      expect(withSource.gameplayDiscoveryClosure.unlistedPackRoots).toEqual(["behavior_packs/b"]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("distinguishes declared world pack membership from manifest presence", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-pack-list-"));
    try {
      for (const name of ["a", "b"]) {
        await mkdir(join(root, "behavior_packs", name), { recursive: true });
        await writeFile(join(root, "behavior_packs", name, "manifest.json"), JSON.stringify({
          format_version: 2,
          header: { name, uuid: name === "a" ? "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" : "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", version: [1, 0, 0] },
          modules: [{ type: "data", uuid: "cccccccc-cccc-cccc-cccc-cccccccccccc", version: [1,0,0] }],
        }));
      }
      await writeFile(join(root, "world_behavior_packs.json"), JSON.stringify([
        { pack_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", version: [1,0,0] },
      ]));
      const entries = await buildFilesystemInventory(root);
      const result = await discoverInspectionPacks(root, "artifact", entries);
      expect(result.packs.map(pack => [pack.root, pack.worldAttachment])).toEqual([
        ["behavior_packs/a", "listed"], ["behavior_packs/b", "not-listed"],
      ]);
      await writeFile(join(root, "world_behavior_packs.json"), "{invalid");
      const unknown = await discoverInspectionPacks(root, "artifact", entries);
      expect(unknown.packs.every(pack => pack.worldAttachment === "unknown")).toBe(true);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

});
