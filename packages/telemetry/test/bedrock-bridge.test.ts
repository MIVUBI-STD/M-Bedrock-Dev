import { describe, expect, it } from "vitest";
import {
  createBedrockConsoleTelemetrySink,
  createBedrockScriptEventTelemetryCollector,
  createBedrockScriptEventTelemetrySink,
  createBedrockTickProvider,
  createBufferedTelemetrySink,
  createTelemetryEmitter,
} from "../src/index.js";

describe("Bedrock telemetry bridge", () => {
  it("reads currentTick from an injected Bedrock-like system", () => {
    const system = { currentTick: 42 };
    const tick = createBedrockTickProvider(system);
    expect(tick()).toBe(42);
    system.currentTick = 43;
    expect(tick()).toBe(43);
  });

  it("sends telemetry as a namespaced script event payload", () => {
    const sent: Array<{ id: string; message: string }> = [];
    const system = {
      currentTick: 1,
      sendScriptEvent(id: string, message: string) {
        sent.push({ id, message });
      },
    };
    const sink = createBedrockScriptEventTelemetrySink(
      system,
      "mivubi:telemetry",
    );
    const emitter = createTelemetryEmitter({
      producer: "instrumentation",
      sink,
      tickProvider: createBedrockTickProvider(system),
    });

    const event = emitter.routeRevalidation({
      routeId: "bridge",
      result: "passed",
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]?.id).toBe("mivubi:telemetry");
    expect(JSON.parse(sent[0]?.message ?? "{}")).toMatchObject({
      eventId: event.eventId,
      kind: "route-revalidation",
      tick: 1,
    });
  });

  it("writes prefixed json lines to an injected console", () => {
    const lines: string[] = [];
    const sink = createBedrockConsoleTelemetrySink({
      warn(message) {
        lines.push(String(message));
      },
    });
    const buffer = createBufferedTelemetrySink();
    const emitter = createTelemetryEmitter({
      producer: "qa",
      sink: {
        emit(event) {
          sink.emit(event);
          buffer.emit(event);
        },
      },
    });

    const event = emitter.mutationVerification({
      result: "passed",
    });

    expect(lines[0]).toBe(
      "[M-Bedrock-Dev telemetry] " + JSON.stringify(event),
    );
    expect(buffer.size).toBe(1);
  });

  it("collects telemetry from the injected script-event signal", () => {
    const callbacks = new Set<(event: {
      id: string;
      message: string;
    }) => void>();
    const buffer = createBufferedTelemetrySink();
    const collector = createBedrockScriptEventTelemetryCollector({
      signal: {
        subscribe(callback) {
          callbacks.add(callback);
        },
        unsubscribe(callback) {
          callbacks.delete(callback);
        },
      },
      sink: buffer,
      eventId: "mivubi:telemetry",
    });

    const event = {
      schemaVersion: 1 as const,
      eventId: "event-1",
      kind: "route-revalidation" as const,
      producer: "runtime" as const,
      scope: { operationId: "op-1" },
      routeId: "bridge",
      result: "passed" as const,
    };

    for (const callback of callbacks) {
      callback({
        id: "other:channel",
        message: JSON.stringify(event),
      });
      callback({
        id: "mivubi:telemetry",
        message: JSON.stringify(event),
      });
    }

    expect(buffer.snapshot()).toEqual([event]);

    collector.dispose();
    expect(callbacks.size).toBe(0);
  });

  it("can reject or report invalid script-event payloads", () => {
    const invalid: string[] = [];
    let callback:
      | ((event: { id: string; message: string }) => void)
      | undefined;
    createBedrockScriptEventTelemetryCollector({
      signal: {
        subscribe(next) {
          callback = next;
        },
      },
      sink: createBufferedTelemetrySink(),
      onInvalid(error) {
        invalid.push(error.message);
      },
    });

    callback?.({
      id: "mivubi:telemetry",
      message: JSON.stringify({
        schemaVersion: 1,
        eventId: "bad",
        kind: "unknown",
        producer: "qa",
        scope: {},
      }),
    });

    expect(invalid[0]).toMatch(/unsupported/);
  });

  it("rejects a script-event payload that exceeds the configured limit", () => {
    const sink = createBedrockScriptEventTelemetrySink(
      { sendScriptEvent() {} },
      "mivubi:telemetry",
      32,
    );
    const emitter = createTelemetryEmitter({
      producer: "qa",
      sink,
    });

    expect(() => emitter.routeRevalidation({
      routeId: "a-very-long-route-id-that-will-not-fit",
      result: "passed",
    })).toThrow(/payload limit/);
  });

  it("rejects an unnamespaced script event id", () => {
    expect(() => createBedrockScriptEventTelemetrySink(
      { sendScriptEvent() {} },
      "telemetry",
    )).toThrow(/namespaced/);
  });
});
