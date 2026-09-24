import { describe, expect, it } from "vitest";
import {
  createBedrockConsoleTelemetrySink,
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

  it("rejects an unnamespaced script event id", () => {
    expect(() => createBedrockScriptEventTelemetrySink(
      { sendScriptEvent() {} },
      "telemetry",
    )).toThrow(/namespaced/);
  });
});
