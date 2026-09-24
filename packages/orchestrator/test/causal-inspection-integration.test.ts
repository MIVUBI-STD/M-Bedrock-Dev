import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
import { inspectDirectory } from "../src/inspect.js";

const catalog: KnowledgeCatalog = {
  schemaVersion: 1,
  sources: [{
    id: "policy",
    title: "Policy",
    url: "project://knowledge/causal-integration",
    authority: "project-policy",
    confidence: "designed",
    retrievedDate: "2026-09-24",
  }],
  facts: [],
  relations: [{
    id: "route-mutation-needs-revalidation",
    domain: "entity-runtime",
    subject: "route-affecting-world-mutation",
    kind: "requires",
    object: "route-revalidation",
    classification: "project-policy",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["policy"],
    diagnosticSeverity: "medium",
    causalConsequences: [
      "navigation-stall-risk",
      "fallback-recovery-risk",
    ],
  }],
};

describe("inspection causal analysis", () => {
  it("projects navigation risk from an overlapping route mutation without claiming an observed stall", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-causal-test-"));
    try {
      const functions = join(root, "behavior_pack", "functions");
      await mkdir(functions, { recursive: true });
      await writeFile(
        join(functions, "mutate.mcfunction"),
        "fill 10 64 10 20 70 20 minecraft:stone\n",
        "utf8",
      );

      const result = await inspectDirectory(
        root,
        "artifact-test",
        {
          edition: "bedrock",
          staticExecutionDimension: "overworld",
          routeCorridors: [{
            id: "bridge-route",
            dimension: "overworld",
            volume: {
              min: { x: 0, y: 60, z: 0 },
              max: { x: 30, y: 80, z: 30 },
            },
          }],
        },
        "fingerprint-test",
        catalog,
      );

      expect(result.routeAnalysis.overlaps).toBe(1);
      expect(result.knowledgeRuntime.evidenceGaps).toBe(1);
      expect(result.causalAnalysis.chains).toHaveLength(1);
      expect(result.causalAnalysis.lowConfidence).toBe(1);
      expect(result.causalAnalysis.projectedRisks).toBe(2);

      const chain = result.causalAnalysis.chains[0]!;
      expect(chain.nodes).toEqual(expect.arrayContaining([
        expect.objectContaining({
          label: "route-affecting-world-mutation",
          kind: "observed-state",
        }),
        expect.objectContaining({
          label: "route-revalidation",
          kind: "missing-requirement",
        }),
        expect.objectContaining({
          label: "navigation-stall-risk",
          kind: "downstream-risk",
        }),
      ]));
      expect(chain.nodes.some(
        (node) => node.label === "navigation-stall-observed",
      )).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
