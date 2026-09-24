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
    url: "project://knowledge/telemetry-integration",
    authority: "project-policy",
    confidence: "designed",
    retrievedDate: "2026-09-24",
  }],
  facts: [],
  relations: [{
    id: "double-start",
    domain: "multiplayer",
    subject: "arena-start-observed",
    kind: "requires",
    object: "single-start-transaction-owner",
    classification: "project-policy",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["policy"],
    diagnosticSeverity: "critical",
    causalConsequences: ["arena-state-race-risk"],
    causalOutcomePredicates: {
      "arena-state-race-risk": ["arena-double-start-observed"],
    },
  }, {
    id: "stale-callback",
    domain: "event-ordering",
    subject: "deferred-callback-executed",
    kind: "requires",
    object: "current-generation-callback",
    classification: "project-policy",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["policy"],
    diagnosticSeverity: "critical",
    causalConsequences: ["cross-round-state-risk"],
    causalOutcomePredicates: {
      "cross-round-state-risk": ["stale-callback-observed"],
    },
  }, {
    id: "invalid-revive",
    domain: "player-life",
    subject: "revive-completion-observed",
    kind: "requires",
    object: "valid-revive-transaction",
    classification: "project-policy",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["policy"],
    diagnosticSeverity: "critical",
    causalConsequences: ["invalid-revive-state-risk"],
    causalOutcomePredicates: {
      "invalid-revive-state-risk": ["revive-anomaly-observed"],
    },
  }],
};

describe("standard telemetry inspection", () => {
  it("turns direct runtime anomalies into high-confidence causal incidents", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-telemetry-test-"));
    try {
      await mkdir(join(root, "behavior_pack", "functions"), {
        recursive: true,
      });
      await writeFile(
        join(root, "behavior_pack", "functions", "noop.mcfunction"),
        "say ready\n",
        "utf8",
      );

      const result = await inspectDirectory(
        root,
        "artifact-telemetry",
        { edition: "bedrock" },
        "fingerprint-telemetry",
        catalog,
        [],
        [{
          schemaVersion: 1,
          eventId: "double-1",
          kind: "arena-double-start",
          producer: "qa",
          scope: {},
          arenaId: "arena-1",
          arenaGeneration: 4,
          startOperationIds: ["a", "b"],
        }, {
          schemaVersion: 1,
          eventId: "callback-1",
          kind: "stale-callback",
          producer: "instrumentation",
          scope: { arenaId: "arena-1", arenaGeneration: 4 },
          subsystem: "countdown",
          capturedGeneration: 3,
          currentGeneration: 4,
        }, {
          schemaVersion: 1,
          eventId: "revive-1",
          kind: "revive-anomaly",
          producer: "qa",
          scope: {
            arenaId: "arena-1",
            arenaGeneration: 4,
            playerKey: "player-a",
          },
          anomaly: "self-revive",
          targetPlayerKey: "player-a",
          reviverPlayerKey: "player-a",
        }],
      );

      expect(result.telemetryAnalysis).toEqual({
        events: 3,
        evidenceRecords: 9,
        byKind: {
          "arena-double-start": 1,
          "stale-callback": 1,
          "revive-anomaly": 1,
        },
      });
      expect(result.knowledgeRuntime.violations).toBe(3);
      expect(result.causalAnalysis.highConfidence).toBe(3);
      expect(result.causalAnalysis.observedOutcomes).toBe(3);
      expect(result.diagnostics.filter(
        (finding) => finding.code === "KNOWLEDGE_RELATION_VIOLATION",
      )).toHaveLength(3);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("uses route revalidation telemetry as direct proof in the matching operation scope", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-route-telemetry-test-"));
    try {
      const functions = join(root, "behavior_pack", "functions");
      await mkdir(functions, { recursive: true });
      await writeFile(
        join(functions, "mutate.mcfunction"),
        "fill 10 64 10 20 70 20 minecraft:stone\n",
        "utf8",
      );

      const operationId =
        "artifact-route:behavior_pack/functions/mutate.mcfunction:1:0";

      const routeCatalog: KnowledgeCatalog = {
        ...catalog,
        relations: [{
          id: "route",
          domain: "entity-runtime",
          subject: "route-affecting-world-mutation",
          kind: "requires",
          object: "route-revalidation",
          classification: "project-policy",
          applicability: { editions: ["bedrock"] },
          sourceIds: ["policy"],
          diagnosticSeverity: "medium",
          causalConsequences: ["navigation-stall-risk"],
          causalOutcomePredicates: {
            "navigation-stall-risk": ["navigation-stall-observed"],
          },
        }],
      };

      const passed = await inspectDirectory(
        root,
        "artifact-route",
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
        "fingerprint-route",
        routeCatalog,
        [],
        [{
          schemaVersion: 1,
          eventId: "route-pass",
          kind: "route-revalidation",
          producer: "runtime",
          scope: { operationId },
          routeId: "bridge",
          result: "passed",
        }],
      );

      expect(passed.knowledgeRuntime.evidenceGaps).toBe(0);
      expect(passed.knowledgeRuntime.violations).toBe(0);

      const failed = await inspectDirectory(
        root,
        "artifact-route",
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
        "fingerprint-route",
        routeCatalog,
        [],
        [{
          schemaVersion: 1,
          eventId: "route-fail",
          kind: "route-revalidation",
          producer: "runtime",
          scope: { operationId },
          routeId: "bridge",
          result: "failed",
        }],
      );

      expect(failed.knowledgeRuntime.violations).toBe(1);
      expect(failed.causalAnalysis.highConfidence).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
