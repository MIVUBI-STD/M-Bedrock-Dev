import { describe, expect, it } from "vitest";
import {
  createTelemetryFrameCollector,
  frameTelemetryBatch,
} from "../src/index.js";

const batch = {
  schemaVersion: 1 as const,
  sessionId: "qa-1",
  events: [{
    schemaVersion: 1 as const,
    eventId: "route-1",
    kind: "route-revalidation" as const,
    producer: "runtime" as const,
    scope: { operationId: "route-op" },
    routeId: "bridge",
    result: "passed" as const,
  }],
};

describe("telemetry frame collector", () => {
  it("assembles out-of-order frames and removes completed state", () => {
    const collector = createTelemetryFrameCollector();
    const frames = frameTelemetryBatch(batch, {
      batchId: "batch-a",
      maxPayloadCharacters: 24,
    });

    let completed;
    for (const frame of [...frames].reverse()) {
      const result = collector.accept(frame);
      if (result.status === "complete") completed = result;
    }

    expect(completed).toEqual(expect.objectContaining({
      status: "complete",
      batchId: "batch-a",
      batch,
    }));
    expect(collector.pendingBatches).toBe(0);
  });

  it("treats an identical repeated frame as idempotent", () => {
    const collector = createTelemetryFrameCollector();
    const frames = frameTelemetryBatch(batch, {
      batchId: "batch-a",
      maxPayloadCharacters: 24,
    });
    const first = frames[0]!;

    expect(collector.accept(first).status).toBe("pending");
    const duplicate = collector.accept(first);
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.receivedParts).toBe(1);
  });

  it("rejects a conflicting duplicate frame", () => {
    const collector = createTelemetryFrameCollector();
    const frames = frameTelemetryBatch(batch, {
      batchId: "batch-a",
      maxPayloadCharacters: 24,
    });
    const first = frames[0]!;
    collector.accept(first);

    expect(() => collector.accept({
      ...first,
      payload: first.payload + "corrupt",
    })).toThrow(/conflicts with previously received part/);
  });

  it("evicts the oldest incomplete batch at the pending budget", () => {
    const collector = createTelemetryFrameCollector({
      maxPendingBatches: 1,
    });
    const a = frameTelemetryBatch(batch, {
      batchId: "batch-a",
      maxPayloadCharacters: 10,
    });
    const b = frameTelemetryBatch(batch, {
      batchId: "batch-b",
      maxPayloadCharacters: 10,
    });

    collector.accept(a[0]!);
    const result = collector.accept(b[0]!);

    expect(result.evictedBatchId).toBe("batch-a");
    expect(collector.pendingBatches).toBe(1);
    expect(collector.discard("batch-a")).toBe(false);
    expect(collector.discard("batch-b")).toBe(true);
  });

  it("rejects batches larger than the configured frame budget", () => {
    const collector = createTelemetryFrameCollector({
      maxFramesPerBatch: 2,
    });
    const frames = frameTelemetryBatch(batch, {
      batchId: "batch-a",
      maxPayloadCharacters: 5,
    });

    expect(frames.length).toBeGreaterThan(2);
    expect(() => collector.accept(frames[0]!))
      .toThrow(/partCount exceeds collector bounds/);
  });
});
