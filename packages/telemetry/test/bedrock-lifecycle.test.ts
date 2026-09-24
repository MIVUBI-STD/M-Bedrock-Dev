import { describe, expect, it } from "vitest";
import {
  createBedrockTelemetryLifecycleHost,
  type BedrockScriptEventMessageLike,
} from "../src/index.js";

function fakeSystem() {
  let nextHandle = 1;
  const intervals = new Map<number, () => void>();
  const scriptCallbacks = new Set<
    (event: BedrockScriptEventMessageLike) => void
  >();

  return {
    currentTick: 100,
    afterEvents: {
      scriptEventReceive: {
        subscribe(
          callback: (event: BedrockScriptEventMessageLike) => void,
        ) {
          scriptCallbacks.add(callback);
        },
        unsubscribe(
          callback: (event: BedrockScriptEventMessageLike) => void,
        ) {
          scriptCallbacks.delete(callback);
        },
      },
    },
    runInterval(callback: () => void, _intervalTicks: number) {
      const handle = nextHandle++;
      intervals.set(handle, callback);
      return handle;
    },
    clearRun(handle: number) {
      intervals.delete(handle);
    },
    fireIntervals() {
      for (const callback of [...intervals.values()]) callback();
    },
    emitScriptEvent(event: BedrockScriptEventMessageLike) {
      for (const callback of [...scriptCallbacks]) callback(event);
    },
    intervalCount: () => intervals.size,
    subscriberCount: () => scriptCallbacks.size,
  };
}

describe("Bedrock telemetry lifecycle host", () => {
  it("starts and stops periodic flush plus script-event collection idempotently", () => {
    const system = fakeSystem();
    const sent: unknown[] = [];
    const host = createBedrockTelemetryLifecycleHost({
      system,
      sessionId: "run-1",
      artifactId: "art-1",
      streamId: "runtime-main",
      flushIntervalTicks: 20,
      transport: {
        send(batch) {
          sent.push(batch);
        },
      },
    });

    expect(host.running).toBe(false);
    expect(host.start()).toBe(true);
    expect(host.start()).toBe(false);
    expect(host.running).toBe(true);
    expect(system.intervalCount()).toBe(1);
    expect(system.subscriberCount()).toBe(1);

    host.kit.emitter.routeRevalidation({
      routeId: "bridge",
      result: "passed",
    });
    expect(host.kit.buffer.size).toBe(1);

    system.fireIntervals();
    expect(sent).toHaveLength(1);
    expect(host.kit.buffer.size).toBe(0);

    expect(host.stop()).toBe(true);
    expect(host.stop()).toBe(false);
    expect(host.running).toBe(false);
    expect(system.intervalCount()).toBe(0);
    expect(system.subscriberCount()).toBe(0);
  });

  it("collects leaf telemetry from the shared ScriptEvent channel", () => {
    const system = fakeSystem();
    const host = createBedrockTelemetryLifecycleHost({
      system,
      transport: { send() {} },
    });
    host.start();

    system.emitScriptEvent({
      id: "mivubi:telemetry",
      message: JSON.stringify({
        schemaVersion: 1,
        eventId: "leaf-1",
        kind: "mutation-verification",
        producer: "instrumentation",
        scope: { operationId: "load-1" },
        result: "passed",
      }),
    });

    expect(host.kit.buffer.snapshot()).toEqual([
      expect.objectContaining({
        eventId: "leaf-1",
        kind: "mutation-verification",
      }),
    ]);

    host.dispose();
    expect(system.subscriberCount()).toBe(0);
  });

  it("retains buffered evidence if synchronous transport fails", () => {
    const system = fakeSystem();
    const errors: unknown[] = [];
    const host = createBedrockTelemetryLifecycleHost({
      system,
      transport: {
        send() {
          throw new Error("transport down");
        },
      },
      onFlushError(error) {
        errors.push(error);
      },
    });

    host.kit.emitter.routeRevalidation({
      routeId: "bridge",
      result: "failed",
    });

    expect(host.flushNow()).toBeUndefined();
    expect(errors).toHaveLength(1);
    expect(host.kit.buffer.size).toBe(1);
  });

  it("can flush during stop and rejects restart after dispose", () => {
    const system = fakeSystem();
    const sent: unknown[] = [];
    const host = createBedrockTelemetryLifecycleHost({
      system,
      transport: {
        send(batch) {
          sent.push(batch);
        },
      },
    });

    host.start();
    host.kit.emitter.mutationVerification({
      result: "passed",
    });

    expect(host.stop({ flush: true })).toBe(true);
    expect(sent).toHaveLength(1);

    host.dispose();
    expect(() => host.start()).toThrow(/disposed/);
  });

  it("honors the minimum flush event threshold", () => {
    const system = fakeSystem();
    const sent: unknown[] = [];
    const host = createBedrockTelemetryLifecycleHost({
      system,
      minimumFlushEvents: 2,
      transport: {
        send(batch) {
          sent.push(batch);
        },
      },
    });

    host.kit.emitter.routeRevalidation({
      routeId: "bridge",
      result: "passed",
    });
    expect(host.flushNow()).toBeUndefined();
    expect(host.kit.buffer.size).toBe(1);

    host.kit.emitter.routeRevalidation({
      routeId: "bridge",
      result: "failed",
    });
    expect(host.flushNow()).toBeDefined();
    expect(sent).toHaveLength(1);
  });
});
