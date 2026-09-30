import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectDirectory } from "../src/inspect.js";

describe("cross-domain inspect integration", () => {
  it("correlates manifest and script facts and reports undeclared Minecraft modules", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-integrated-"));
    const pack = join(root, "behavior_packs/demo");

    await mkdir(join(pack, "scripts"), { recursive: true });
    await writeFile(join(pack, "manifest.json"), JSON.stringify({
      format_version: 2,
      header: {
        name: "Demo",
        uuid: "00000000-0000-0000-0000-000000001001",
        version: [1,0,0],
        min_engine_version: [1,21,0]
      },
      modules: [{
        type: "script",
        uuid: "00000000-0000-0000-0000-000000001002",
        version: [1,0,0],
        entry: "scripts/main.js"
      }]
    }));

    await writeFile(
      join(pack, "scripts/main.js"),
      'import { world } from "@minecraft/server";\nworld.afterEvents.playerSpawn.subscribe(() => {});\n',
    );

    const result = await inspectDirectory(root);

    expect(result.scripts).toBe(1);
    expect(result.packs[0]?.minEngineVersion).toBe("1.21.0");
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "SCRIPT_MODULE_UNDECLARED" }),
    ]));
  });

  it("detects world DB presence without opening the database", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-db-presence-"));
    await mkdir(join(root, "db"), { recursive: true });
    await writeFile(join(root, "db/CURRENT"), "MANIFEST-000001\n");

    const result = await inspectDirectory(root);

    expect(result.worldDatabase).toEqual({
      present: true,
      fileCount: 1,
    });
  });
});
