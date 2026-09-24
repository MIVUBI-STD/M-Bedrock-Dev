import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { inspectDirectory } from "../src/inspect.js";

describe("inspection decision basis", () => {
  it("changes runtime evidence revision when telemetry semantics change", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-decision-basis-"));
    try {
      await mkdir(join(root, "behavior_pack", "functions"), {
        recursive: true,
      });
      await writeFile(
        join(root, "behavior_pack", "functions", "noop.mcfunction"),
        "say ready\n",
        "utf8",
      );

      const common = {
        schemaVersion: 1 as const,
        eventId: "route-1",
        kind: "route-revalidation" as const,
        producer: "runtime" as const,
        scope: { operationId: "route-op" },
        tick: 10,
        routeId: "bridge",
      };

      const passed = await inspectDirectory(
        root,
        "artifact-basis",
        { edition: "bedrock" },
        "source-a",
        undefined,
        [],
        [{ ...common, result: "passed" }],
      );
      const failed = await inspectDirectory(
        root,
        "artifact-basis",
        { edition: "bedrock" },
        "source-a",
        undefined,
        [],
        [{ ...common, result: "failed" }],
      );

      expect(passed.decisionBasis.sourceFingerprint).toBe("source-a");
      expect(passed.decisionBasis.graphFingerprint).toBeDefined();
      expect(passed.decisionBasis.targetProfileFingerprint).toBeDefined();
      expect(passed.decisionBasis.runtimeEvidenceRevision).toBeDefined();
      expect(passed.decisionBasis.runtimeEvidenceRevision)
        .not.toBe(failed.decisionBasis.runtimeEvidenceRevision);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps the evidence revision stable when the same runtime evidence arrives in another array order", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-decision-order-"));
    try {
      await mkdir(join(root, "behavior_pack", "functions"), {
        recursive: true,
      });
      await writeFile(
        join(root, "behavior_pack", "functions", "noop.mcfunction"),
        "say ready\n",
        "utf8",
      );

      const a = {
        schemaVersion: 1 as const,
        eventId: "a",
        kind: "route-revalidation" as const,
        producer: "runtime" as const,
        scope: { operationId: "route-a" },
        tick: 10,
        routeId: "a",
        result: "passed" as const,
      };
      const b = {
        schemaVersion: 1 as const,
        eventId: "b",
        kind: "route-revalidation" as const,
        producer: "runtime" as const,
        scope: { operationId: "route-b" },
        tick: 11,
        routeId: "b",
        result: "failed" as const,
      };

      const left = await inspectDirectory(
        root,
        "artifact-basis-order",
        { edition: "bedrock" },
        "source-a",
        undefined,
        [],
        [a, b],
      );
      const right = await inspectDirectory(
        root,
        "artifact-basis-order",
        { edition: "bedrock" },
        "source-a",
        undefined,
        [],
        [b, a],
      );

      expect(left.decisionBasis.runtimeEvidenceRevision)
        .toBe(right.decisionBasis.runtimeEvidenceRevision);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
