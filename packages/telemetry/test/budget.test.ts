import { describe, expect, it } from "vitest";
import {
  createBufferedTelemetrySink,
  createSamplingTelemetrySink,
  createTelemetryEmitter,
  createTickBudgetedTelemetrySink,
} from "../src/index.js";

describe("telemetry performance budgets", () => {
  it("limits events per tick and records dropped metrics", () => {
    const buffer = createBufferedTelemetrySink();
    const dropped: string[] = [];
    const budget = createTickBudgetedTelemetrySink(buffer, {
      maxEventsPerTick: 2,
      onDrop(event, reason) {
        dropped.push(event.eventId + ":" + reason);
      },
    });
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: budget,
    });

    telemetry.routeRevalidation({
      routeId: "a",
      result: "passed",
      tick: 10,
    });
    telemetry.routeRevalidation({
      routeId: "b",
      result: "passed",
      tick: 10,
    });
    const third = telemetry.routeRevalidation({
      routeId: "c",
      result: "passed",
      tick: 10,
    });

    expect(buffer.size).toBe(2);
    expect(budget.stats()).toEqual({
      emitted: 2,
      dropped: 1,
      droppedByKind: {
        "route-revalidation": 1,
      },
    });
    expect(dropped).toEqual([
      third.eventId + ":tick-budget-exceeded",
    ]);

    telemetry.routeRevalidation({
      routeId: "d",
      result: "passed",
      tick: 11,
    });
    expect(buffer.size).toBe(3);
  });

  it("applies a separate bounded budget to unticked events", () => {
    const buffer = createBufferedTelemetrySink();
    const budget = createTickBudgetedTelemetrySink(buffer, {
      maxEventsPerTick: 10,
      maxEventsWithoutTick: 1,
    });
    const telemetry = createTelemetryEmitter({
      producer: "manual",
      sink: budget,
    });

    telemetry.mutationVerification({ result: "passed" });
    telemetry.mutationVerification({ result: "failed" });

    expect(buffer.size).toBe(1);
    expect(budget.stats().dropped).toBe(1);

    budget.resetStats();
    expect(budget.stats()).toEqual({
      emitted: 0,
      dropped: 0,
      droppedByKind: {},
    });
  });

  it("samples high-frequency events deterministically per key", () => {
    const buffer = createBufferedTelemetrySink();
    const sampled = createSamplingTelemetrySink(buffer, {
      every: 3,
      key: (event) => event.kind,
    });
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: sampled,
    });

    for (let index = 0; index < 7; index += 1) {
      telemetry.entityStall({
        entityKey: "zombie-" + index,
      });
    }

    expect(buffer.snapshot().map((event) => event.eventId)).toEqual([
      "instrumentation:entity-stall:1",
      "instrumentation:entity-stall:4",
      "instrumentation:entity-stall:7",
    ]);
  });
});
