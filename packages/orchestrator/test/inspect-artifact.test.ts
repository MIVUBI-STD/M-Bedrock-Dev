import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { packageDirectoryDeterministically } from "../../archive/src/package-zip.js";
import { sha256File } from "../../artifact/src/index.js";
import { inspectArtifact } from "../src/inspect-artifact.js";

async function createSyntheticWorldTree(root: string): Promise<void> {
  const pack = join(root, "behavior_packs/demo");
  await mkdir(join(pack, "functions"), { recursive: true });
  await mkdir(join(pack, "structures/demo"), { recursive: true });

  await writeFile(join(root, "levelname.txt"), "M-Bedrock-Dev Synthetic Fixture\n");
  await writeFile(join(pack, "manifest.json"), JSON.stringify({
    format_version: 2,
    header: {
      name: "Demo",
      description: "Synthetic fixture",
      uuid: "00000000-0000-0000-0000-000000000101",
      version: [1, 0, 0],
      min_engine_version: [1, 20, 0]
    },
    modules: [{
      type: "data",
      uuid: "00000000-0000-0000-0000-000000000102",
      version: [1, 0, 0]
    }]
  }, null, 2));

  await writeFile(
    join(pack, "functions/start.mcfunction"),
    [
      "structure load demo:test 0 0 0",
      "function missing/reset"
    ].join("\n") + "\n",
  );

  await writeFile(join(pack, "structures/demo/test.mcstructure"), "opaque-fixture");
}

describe("inspectArtifact", () => {
  it("packages then inspects a synthetic mcworld-shaped archive", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-artifact-"));
    const tree = join(root, "tree");
    const archive = join(root, "fixture.mcworld");

    await mkdir(tree, { recursive: true });
    await createSyntheticWorldTree(tree);
    await packageDirectoryDeterministically(tree, archive);

    const result = await inspectArtifact(archive);

    expect(result.archiveEntries).toBeGreaterThan(0);
    expect(result.packs[0]?.type).toBe("behavior_pack");
    expect(result.functions).toBe(1);
    expect(result.structures).toBe(1);
    expect(result.unresolvedReferences).toBe(1);
  });

  it("produces byte-identical archives for identical trees", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-determinism-"));
    const tree = join(root, "tree");
    const first = join(root, "a.mcworld");
    const second = join(root, "b.mcworld");

    await mkdir(tree, { recursive: true });
    await createSyntheticWorldTree(tree);

    await packageDirectoryDeterministically(tree, first);
    await packageDirectoryDeterministically(tree, second);

    expect(await sha256File(first)).toBe(await sha256File(second));
  });
});
