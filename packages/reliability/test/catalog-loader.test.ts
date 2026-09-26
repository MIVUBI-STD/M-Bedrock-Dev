import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadCoverageCatalog,
  loadRegressionCatalog,
  loadUpdateDeltaCatalog,
} from "../src/catalog-loader.js";

describe("reliability catalog loader", () => {
  it("loads validated persistent catalogs", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-catalog-"));
    await mkdir(join(root, "minecraft-updates"), { recursive: true });

    await writeFile(join(root, "regressions.json"), JSON.stringify({
      schemaVersion: 1,
      regressions: [{
        id: "reg",
        title: "Regression",
        domain: "commands",
        discoveredBy: "manual",
        invariantIds: [],
        triggerTags: [],
        capabilityTags: ["command:fill"],
        reproduction: ["run"],
        expected: "works",
        observed: "fails"
      }]
    }));

    await writeFile(join(root, "coverage.json"), JSON.stringify({
      schemaVersion: 1,
      coverage: [{
        domain: "commands",
        lane: "static",
        state: "partial",
        evidence: "Fixture proves the loader accepts evidence-backed partial coverage.",
        proofPaths: ["fixture://commands-static"]
      }]
    }));

    await writeFile(join(root, "minecraft-updates/1.2.3.json"), JSON.stringify({
      schemaVersion: 1,
      delta: {
        toVersion: "1.2.3",
        entries: [{
          id: "change",
          kind: "changed",
          domain: "commands",
          capabilityTags: ["command:fill"],
          affectedIdentifiers: ["fill"],
          summary: "Changed",
          source: "fixture",
          confidence: "documented"
        }]
      }
    }));

    expect(await loadRegressionCatalog(root)).toHaveLength(1);
    expect(await loadCoverageCatalog(root)).toHaveLength(1);
    expect((await loadUpdateDeltaCatalog(root, "1.2.3")).toVersion).toBe("1.2.3");
  });

  it("rejects filename/version mismatch", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-catalog-"));
    await mkdir(join(root, "minecraft-updates"), { recursive: true });
    await writeFile(join(root, "minecraft-updates/1.2.3.json"), JSON.stringify({
      schemaVersion: 1,
      delta: {
        toVersion: "9.9.9",
        entries: []
      }
    }));

    await expect(loadUpdateDeltaCatalog(root, "1.2.3"))
      .rejects.toThrow(/filename\/version mismatch/);
  });
});
