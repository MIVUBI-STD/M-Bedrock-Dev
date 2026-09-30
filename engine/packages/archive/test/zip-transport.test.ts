import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NORMAL_EXTRACTION_BUDGET } from "../src/budgets.js";
import { packageDirectoryDeterministically } from "../src/package-zip.js";
import { extractZipSafely, inventoryZip } from "../src/zip-transport.js";

describe("zip transport", () => {
  it("packages, inventories and extracts a small tree", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-zip-"));
    const input = join(root, "input");
    const output = join(root, "output.mcworld");
    const extracted = join(root, "extracted");

    await mkdir(join(input, "behavior_packs/demo/functions"), { recursive: true });
    await writeFile(
      join(input, "behavior_packs/demo/functions/start.mcfunction"),
      "say hi\n",
    );

    await packageDirectoryDeterministically(input, output);
    const inventory = await inventoryZip(output);
    expect(inventory.entries.some((entry) => entry.path.endsWith("start.mcfunction"))).toBe(true);

    await extractZipSafely(output, extracted, NORMAL_EXTRACTION_BUDGET);
    expect(
      await readFile(join(extracted, "behavior_packs/demo/functions/start.mcfunction"), "utf8"),
    ).toBe("say hi\n");
  });
});
