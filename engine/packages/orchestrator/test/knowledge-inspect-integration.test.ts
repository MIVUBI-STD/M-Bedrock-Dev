import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { KnowledgeCatalog } from "../../knowledge/src/index.js";
import { inspectDirectory } from "../src/inspect.js";

const catalog: KnowledgeCatalog = {
  schemaVersion: 1,
  sources: [{
    id: "official",
    title: "Official",
    url: "https://learn.microsoft.com/example",
    authority: "official",
    confidence: "documented",
    retrievedDate: "2026-09-24",
  }],
  facts: [],
  relations: [{
    id: "structure-needs-readiness",
    domain: "world-mutation",
    subject: "structure-placement-request",
    kind: "requires",
    object: "post-placement-readiness-verification",
    classification: "derived-rule",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["official"],
  }, {
    id: "placement-needs-target",
    domain: "world-mutation",
    subject: "structure-placement-request",
    kind: "requires",
    object: "structure-target-resolved",
    classification: "derived-rule",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["official"],
  }],
};

describe("inspectDirectory executable knowledge integration", () => {
  it("produces scoped knowledge diagnostics from real discovered function files", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-knowledge-test-"));
    try {
      const functions = join(root, "behavior_pack", "functions");
      await mkdir(functions, { recursive: true });
      await writeFile(
        join(functions, "start.mcfunction"),
        "structure load demo:missing 0 64 0\n",
        "utf8",
      );

      const result = await inspectDirectory(
        root,
        "artifact-test",
        { edition: "bedrock", version: "1.21.130" },
        "fingerprint-test",
        catalog,
      );

      expect(result.knowledgeRuntime.enabled).toBe(true);
      expect(result.knowledgeRuntime.profileResolved).toBe(true);
      expect(result.knowledgeRuntime.violations).toBe(1);
      expect(result.knowledgeRuntime.evidenceGaps).toBe(1);
      expect(result.knowledgeRuntime.validationCases).toBe(2);
      expect(result.targetCompatibility.version).toBe("1.21.130");
      expect(result.diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: "KNOWLEDGE_RELATION_VIOLATION" }),
        expect.objectContaining({ code: "KNOWLEDGE_EVIDENCE_GAP" }),
      ]));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});