import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { KnowledgeCatalog } from "../../knowledge/src/index.js";
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
    causalCorroborators: {
      "navigation-stall-risk": [
        "route-navigation-consumer-present",
        "route-target-driven-consumer-present",
      ],
    },
    causalOutcomePredicates: {
      "navigation-stall-risk": [
        "navigation-stall-observed",
      ],
      "fallback-recovery-risk": [
        "teleport-fallback-observed",
      ],
    },
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
      expect(result.causalAnalysis.incidents).toHaveLength(1);
      expect(result.causalAnalysis.rootCauseCandidates).toBe(1);

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
  it("corroborates navigation risk only when the route explicitly links a navigable entity", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-causal-linked-test-"));
    try {
      const functions = join(root, "behavior_pack", "functions");
      const entities = join(root, "behavior_pack", "entities");
      await mkdir(functions, { recursive: true });
      await mkdir(entities, { recursive: true });

      await writeFile(
        join(functions, "mutate.mcfunction"),
        "fill 10 64 10 20 70 20 minecraft:stone\n",
        "utf8",
      );
      await writeFile(
        join(entities, "zombie.json"),
        JSON.stringify({
          format_version: "1.21.0",
          "minecraft:entity": {
            description: {
              identifier: "demo:zombie",
            },
            components: {
              "minecraft:navigation.walk": {},
              "minecraft:movement.basic": {},
              "minecraft:behavior.nearest_attackable_target": {
                entity_types: [{
                  filters: {
                    test: "is_family",
                    subject: "other",
                    value: "player",
                  },
                  max_dist: 32,
                }],
              },
            },
          },
        }),
        "utf8",
      );

      const result = await inspectDirectory(
        root,
        "artifact-linked-test",
        {
          edition: "bedrock",
          staticExecutionDimension: "overworld",
          routeCorridors: [{
            id: "bridge-route",
            dimension: "overworld",
            entityKeys: ["demo:zombie"],
            volume: {
              min: { x: 0, y: 60, z: 0 },
              max: { x: 30, y: 80, z: 30 },
            },
          }],
        },
        "fingerprint-linked-test",
        catalog,
      );

      expect(result.routeAnalysis.overlaps).toBe(1);
      expect(result.causalAnalysis.mediumConfidence).toBe(1);
      expect(result.causalAnalysis.lowConfidence).toBe(0);

      const chain = result.causalAnalysis.chains[0]!;
      const navigationRisk = chain.nodes.find(
        (node) => node.label === "navigation-stall-risk",
      );
      expect(navigationRisk).toEqual(expect.objectContaining({
        kind: "downstream-risk",
        corroboratingPredicates: [
          "route-navigation-consumer-present",
          "route-target-driven-consumer-present",
        ],
      }));
      expect(chain.links).toEqual(expect.arrayContaining([
        expect.objectContaining({
          to: navigationRisk?.id,
          strength: "corroborated-risk",
        }),
      ]));
      expect(chain.nodes.some(
        (node) => node.label === "navigation-stall-observed",
      )).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("does not corroborate from an unrelated navigable entity", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-causal-unlinked-test-"));
    try {
      const functions = join(root, "behavior_pack", "functions");
      const entities = join(root, "behavior_pack", "entities");
      await mkdir(functions, { recursive: true });
      await mkdir(entities, { recursive: true });

      await writeFile(
        join(functions, "mutate.mcfunction"),
        "fill 10 64 10 20 70 20 minecraft:stone\n",
        "utf8",
      );
      await writeFile(
        join(entities, "other.json"),
        JSON.stringify({
          "minecraft:entity": {
            description: { identifier: "demo:other" },
            components: {
              "minecraft:navigation.walk": {},
              "minecraft:behavior.nearest_attackable_target": {
                entity_types: [{
                  filters: {
                    test: "is_family",
                    subject: "other",
                    value: "player",
                  },
                }],
              },
            },
          },
        }),
        "utf8",
      );

      const result = await inspectDirectory(
        root,
        "artifact-unlinked-test",
        {
          edition: "bedrock",
          staticExecutionDimension: "overworld",
          routeCorridors: [{
            id: "bridge-route",
            dimension: "overworld",
            entityKeys: ["demo:zombie"],
            volume: {
              min: { x: 0, y: 60, z: 0 },
              max: { x: 30, y: 80, z: 30 },
            },
          }],
        },
        "fingerprint-unlinked-test",
        catalog,
      );

      expect(result.causalAnalysis.lowConfidence).toBe(1);
      expect(result.causalAnalysis.mediumConfidence).toBe(0);
      expect(result.causalAnalysis.chains[0]?.links.some(
        (link) => link.strength === "corroborated-risk",
      )).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("promotes a matching runtime stall observation without claiming sole causation", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-causal-observed-test-"));
    try {
      const functions = join(root, "behavior_pack", "functions");
      const entities = join(root, "behavior_pack", "entities");
      await mkdir(functions, { recursive: true });
      await mkdir(entities, { recursive: true });

      await writeFile(
        join(functions, "mutate.mcfunction"),
        "fill 10 64 10 20 70 20 minecraft:stone\n",
        "utf8",
      );
      await writeFile(
        join(entities, "zombie.json"),
        JSON.stringify({
          "minecraft:entity": {
            description: { identifier: "demo:zombie" },
            components: {
              "minecraft:navigation.walk": {},
              "minecraft:behavior.nearest_attackable_target": {
                entity_types: [{
                  filters: {
                    test: "is_family",
                    subject: "other",
                    value: "player",
                  },
                }],
              },
            },
          },
        }),
        "utf8",
      );

      const operationId =
        "artifact-observed:behavior_pack/functions/mutate.mcfunction:1:0";

      const result = await inspectDirectory(
        root,
        "artifact-observed",
        {
          edition: "bedrock",
          staticExecutionDimension: "overworld",
          routeCorridors: [{
            id: "bridge-route",
            dimension: "overworld",
            entityKeys: ["demo:zombie"],
            volume: {
              min: { x: 0, y: 60, z: 0 },
              max: { x: 30, y: 80, z: 30 },
            },
          }],
        },
        "fingerprint-observed",
        catalog,
        [{
          predicate: "navigation-stall-observed",
          state: "present",
          confidence: "observed",
          scope: { operationId },
          note: "QA telemetry observed no navigation progress in the route scope.",
        }],
      );

      expect(result.causalAnalysis.mediumConfidence).toBe(1);
      expect(result.causalAnalysis.corroboratedRisks).toBe(1);
      expect(result.causalAnalysis.observedOutcomes).toBe(1);

      const chain = result.causalAnalysis.chains[0]!;
      expect(chain.nodes).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: "observed-state",
          label: "navigation-stall-observed",
        }),
      ]));
      expect(chain.summary).toMatch(/attribution remains a corroborated candidate/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not attach a runtime stall observation from a different operation scope", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-causal-wrong-scope-test-"));
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
        "artifact-wrong-scope",
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
        "fingerprint-wrong-scope",
        catalog,
        [{
          predicate: "navigation-stall-observed",
          state: "present",
          confidence: "observed",
          scope: {
            operationId: "artifact-wrong-scope:other/function.mcfunction:9:0",
          },
        }],
      );

      expect(result.causalAnalysis.observedOutcomes).toBe(0);
      expect(result.causalAnalysis.lowConfidence).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
