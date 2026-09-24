import { describe, expect, it } from "vitest";
import { parseTelemetryText } from "../src/telemetry-text.js";

describe("telemetry text parsing", () => {
  it("parses a canonical telemetry batch json document", () => {
    const batch = parseTelemetryText(JSON.stringify({
      schemaVersion: 1,
      sessionId: "run-1",
      events: [{
        schemaVersion: 1,
        eventId: "e1",
        kind: "route-revalidation",
        producer: "runtime",
        scope: { operationId: "op-1" },
        routeId: "bridge",
        result: "passed",
      }],
    }));

    expect(batch.sessionId).toBe("run-1");
    expect(batch.events).toHaveLength(1);
  });

  it("parses prefixed console json lines into one batch", () => {
    const prefix = "[M-Bedrock-Dev telemetry] ";
    const text = [
      prefix + JSON.stringify({
        schemaVersion: 1,
        eventId: "e1",
        kind: "entity-stall",
        producer: "instrumentation",
        scope: { operationId: "op-1" },
        entityKey: "demo:zombie",
      }),
      "2026-09-24 INFO " + JSON.stringify({
        schemaVersion: 1,
        eventId: "e2",
        kind: "teleport-fallback",
        producer: "instrumentation",
        scope: { operationId: "op-1" },
        entityKey: "demo:zombie",
      }),
    ].join("\n");

    const batch = parseTelemetryText(text, {
      linePrefix: prefix,
      sessionId: "console-run",
    });

    expect(batch.sessionId).toBe("console-run");
    expect(batch.events.map((event) => event.eventId)).toEqual(["e1", "e2"]);
  });

  it("rejects duplicate ids in json-line captures", () => {
    const event = JSON.stringify({
      schemaVersion: 1,
      eventId: "same",
      kind: "mutation-verification",
      producer: "qa",
      scope: {},
      result: "passed",
    });

    expect(() => parseTelemetryText(event + "\n" + event))
      .toThrow(/Duplicate telemetry eventId/);
  });
});
