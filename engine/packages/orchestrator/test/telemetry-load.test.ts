import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  frameTelemetryBatch,
  frameTelemetryBatchSet,
} from "../../telemetry/src/index.js";
import {
  loadTelemetryFile,
  parseTelemetryText,
  resolveTelemetryEventsForArtifact,
} from "../src/telemetry-load.js";

const batch = {
  schemaVersion: 1 as const,
  artifactId: "art-a",
  sessionId: "qa-1",
  events: [{
    schemaVersion: 1 as const,
    eventId: "stall-1",
    kind: "entity-stall" as const,
    producer: "qa" as const,
    scope: { operationId: "op-1" },
    entityKey: "demo:zombie",
  }],
};

describe("telemetry loading", () => {
  it("loads and validates telemetry batch JSON", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-telemetry-load-"));
    try {
      const path = join(root, "qa.json");
      await writeFile(path, JSON.stringify(batch), "utf8");

      const loaded = await loadTelemetryFile(path);
      expect(loaded).toEqual(batch);
      expect(resolveTelemetryEventsForArtifact(loaded, "art-a")).toHaveLength(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("loads a JSON array of telemetry frames", () => {
    const frames = frameTelemetryBatch(batch, {
      batchId: "batch-1",
      maxPayloadCharacters: 24,
    });

    expect(parseTelemetryText(JSON.stringify(frames))).toEqual(batch);
  });

  it("loads a canonical telemetry frame-set document", () => {
    const frameSet = frameTelemetryBatchSet(batch, {
      batchId: "batch-1",
      maxPayloadCharacters: 24,
    });

    expect(parseTelemetryText(JSON.stringify(frameSet))).toEqual(batch);
  });

  it("loads a JSONL telemetry frame stream", () => {
    const frames = frameTelemetryBatch(batch, {
      batchId: "batch-1",
      maxPayloadCharacters: 24,
    });
    const jsonl = frames
      .map((frame) => JSON.stringify(frame))
      .join("\n");

    expect(parseTelemetryText(jsonl, "capture.jsonl")).toEqual(batch);
  });

  it("does not reinterpret valid but invalid-schema JSON as JSONL", () => {
    expect(() => parseTelemetryText(JSON.stringify({
      schemaVersion: 1,
      events: [{
        schemaVersion: 1,
        eventId: "",
        kind: "entity-stall",
        producer: "qa",
        scope: {},
        entityKey: "demo:zombie",
      }],
    }))).toThrow(/Invalid telemetry batch/);
  });

  it("reports the exact malformed JSONL line", () => {
    const frames = frameTelemetryBatch(batch, {
      batchId: "batch-1",
      maxPayloadCharacters: 24,
    });
    const text = [
      JSON.stringify(frames[0]),
      "{broken",
    ].join("\n");

    expect(() => parseTelemetryText(text, "capture.jsonl"))
      .toThrow(/line 2/);
  });

  it("rejects telemetry captured from another artifact", () => {
    expect(() => resolveTelemetryEventsForArtifact({
      schemaVersion: 1,
      artifactId: "art-old",
      events: [],
    }, "art-new")).toThrow(/does not match inspected artifact/);
  });
});
