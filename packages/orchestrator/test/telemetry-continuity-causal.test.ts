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
    url: "project://knowledge/continuity-causal-test",
    authority: "project-policy",
    confidence: "designed",
    retrievedDate: "2026-09-24",
  }],
  facts: [],
  relations: [{
    id: "route",
    domain: "entity-runtime",
    subject: "route-affecting-world-mutation",
    kind: "requires",
    object: "route-revalidation",
    classification: "project-policy",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["policy"],
    causalConsequences: ["navigation-stall-risk"],
    causalOutcomePredicates: {
      "navigation-stall-risk": ["navigation-stall-observed"],
    },
  }],
};

describe("telemetry continuity causal gating", () => {
  it("retains the observed stall but does not count it as causal support when events were dropped", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-continuity-causal-"));
    try {
      const functions = join(root, "behavior_pack", "functions");
      await mkdir(functions, { recursive: true });
      await writeFile(
        join(functions, "mutate.mcfunction"),
        "fill 10 64 10 20 70 20 minecraft:stone\n",
        "utf8",
      );

      const operationId =
        "artifact-continuity:behavior_pack/functions/mutate.mcfunction:1:0";

      const result = await inspectDirectory(
        root,
        "artifact-continuity",
        {
          edition: "bedrock",
          staticExecutionDimension: "overworld",
          routeCorridors: [{
            id: "bridge",
            dimension: "overworld",
            volume: {
              min: { x: 0, y: 60, z: 0 },
              max: { x: 30, y: 80, z: 30 },
            },
          }],
        },
        "fingerprint-continuity",
        catalog,
        [],
        [{
          schemaVersion: 1,
          eventId: "mutation-1",
          kind: "mutation-applied",
          producer: "instrumentation",
          scope: { operationId },
          tick: 100,
          streamId: "runtime-main",
          sequence: 1,
          mutationKind: "fill",
          routeId: "bridge",
        }, {
          schemaVersion: 1,
          eventId: "stall-1",
          kind: "entity-stall",
          producer: "instrumentation",
          scope: { operationId },
          tick: 120,
          streamId: "runtime-main",
          sequence: 3,
          entityKey: "demo:zombie",
          routeId: "bridge",
        }],
        1,
      );

      expect(result.telemetryAnalysis.continuity.incomplete).toBe(true);
      expect(result.causalAnalysis.observedOutcomes).toBe(0);
      expect(result.causalAnalysis.lowConfidence).toBeGreaterThan(0);

      const chain = result.causalAnalysis.chains.find(
        (item) => item.nodes.some(
          (node) => node.label === "navigation-stall-observed",
        ),
      );
      expect(chain).toBeDefined();
      expect(chain?.links).toEqual(expect.arrayContaining([
        expect.objectContaining({
          temporalIntegrity: "incomplete",
        }),
      ]));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
