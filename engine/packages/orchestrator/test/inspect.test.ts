import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectDirectory } from "../src/inspect.js";

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
});
