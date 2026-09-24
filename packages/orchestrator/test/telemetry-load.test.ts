import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  loadTelemetryFile,
  resolveTelemetryEventsForArtifact,
} from "../src/telemetry-load.js";

describe("telemetry loading", () => {
  it("loads and validates telemetry JSON", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-telemetry-load-"));
    try {
      const path = join(root, "qa.json");
      await writeFile(path, JSON.stringify({
        schemaVersion: 1,
        artifactId: "art-a",
        events: [{
          schemaVersion: 1,
          eventId: "stall-1",
          kind: "entity-stall",
          producer: "qa",
          scope: { operationId: "op-1" },
          entityKey: "demo:zombie",
        }],
      }), "utf8");

      const batch = await loadTelemetryFile(path);
      expect(batch.artifactId).toBe("art-a");
      expect(resolveTelemetryEventsForArtifact(batch, "art-a")).toHaveLength(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects telemetry captured from another artifact", () => {
    expect(() => resolveTelemetryEventsForArtifact({
      schemaVersion: 1,
      artifactId: "art-old",
      events: [],
    }, "art-new")).toThrow(/does not match inspected artifact/);
  });
});
