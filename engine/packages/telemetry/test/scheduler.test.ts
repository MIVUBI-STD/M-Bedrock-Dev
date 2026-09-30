import { describe, expect, it } from "vitest";
import {
  createBufferedTelemetrySink,
  createPeriodicTelemetryFlush,
  createTelemetryEmitter,
  createTelemetryFlushController,
} from "../src/index.js";

class FakeScheduler {
  callback?: () => void;
  interval?: number;
  clearCalls: number[] = [];
  runCalls = 0;

  runInterval(callback: () => void, intervalTicks: number): number {
    this.runCalls += 1;
    this.callback = callback;
    this.interval = intervalTicks;
    return 99;
  }

  clearRun(handle: number): void {
    this.clearCalls.push(handle);
  }
}

describe("periodic telemetry flush", () => {
  it("starts and stops idempotently", () => {
    const scheduler = new FakeScheduler();
    const buffer = createBufferedTelemetrySink();
    const controller = createTelemetryFlushController({
      buffer,
      transport: { send() {} },
    });
    const periodic = createPeriodicTelemetryFlush({
      scheduler,
      controller,
      intervalTicks: 20,
    });

    expect(periodic.start()).toBe(true);
    expect(periodic.start()).toBe(false);
    expect(scheduler.runCalls).toBe(1);
    expect(scheduler.interval).toBe(20);
    expect(periodic.running).toBe(true);

    expect(periodic.stop()).toBe(true);
    expect(periodic.stop()).toBe(false);
    expect(scheduler.clearCalls).toEqual([99]);
    expect(periodic.running).toBe(false);
  });

  it("flushes batches from the scheduled callback", () => {
    const scheduler = new FakeScheduler();
    const buffer = createBufferedTelemetrySink();
    const sent: unknown[] = [];
    const flushed: unknown[] = [];
    const controller = createTelemetryFlushController({
      buffer,
      transport: {
        send(batch) {
          sent.push(batch);
        },
      },
    });
    const telemetry = createTelemetryEmitter({
      producer: "runtime",
      sink: buffer,
    });
    const periodic = createPeriodicTelemetryFlush({
      scheduler,
      controller,
      intervalTicks: 10,
      onFlush(batch) {
        flushed.push(batch);
      },
    });

    periodic.start();
    telemetry.routeRevalidation({
      routeId: "bridge",
      result: "passed",
    });
    scheduler.callback?.();

    expect(sent).toHaveLength(1);
    expect(flushed).toHaveLength(1);
    expect(buffer.size).toBe(0);
  });

  it("retains events and reports errors when scheduled transport fails", () => {
    const scheduler = new FakeScheduler();
    const buffer = createBufferedTelemetrySink();
    const errors: unknown[] = [];
    const controller = createTelemetryFlushController({
      buffer,
      transport: {
        send() {
          throw new Error("offline");
        },
      },
    });
    const telemetry = createTelemetryEmitter({
      producer: "runtime",
      sink: buffer,
    });
    const periodic = createPeriodicTelemetryFlush({
      scheduler,
      controller,
      intervalTicks: 10,
      onError(error) {
        errors.push(error);
      },
    });

    periodic.start();
    telemetry.routeRevalidation({
      routeId: "bridge",
      result: "failed",
    });
    scheduler.callback?.();

    expect(errors).toHaveLength(1);
    expect(buffer.size).toBe(1);
    expect(periodic.running).toBe(true);
  });

  it("can flush once when stopping", () => {
    const scheduler = new FakeScheduler();
    const buffer = createBufferedTelemetrySink();
    const sent: unknown[] = [];
    const controller = createTelemetryFlushController({
      buffer,
      transport: {
        send(batch) {
          sent.push(batch);
        },
      },
    });
    const telemetry = createTelemetryEmitter({
      producer: "runtime",
      sink: buffer,
    });
    const periodic = createPeriodicTelemetryFlush({
      scheduler,
      controller,
      intervalTicks: 10,
    });

    periodic.start();
    telemetry.routeRevalidation({
      routeId: "bridge",
      result: "passed",
    });

    expect(periodic.stop({ flush: true })).toBe(true);
    expect(sent).toHaveLength(1);
    expect(buffer.size).toBe(0);
  });
});
