import type {
  TelemetryBatch,
  TelemetryEvent,
  TelemetryProducer,
} from "./telemetry.js";

const KINDS = new Set([
  "entity-stall",
  "teleport-fallback",
  "arena-double-start",
  "stale-callback",
  "revive-anomaly",
  "state-drift",
  "route-revalidation",
  "mutation-verification",
]);

const PRODUCERS = new Set<TelemetryProducer>([
  "runtime",
  "qa",
  "manual",
  "instrumentation",
  "server",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(
  value: Record<string, unknown>,
  key: string,
  errors: string[],
  required = true,
): void {
  const item = value[key];
  if (item === undefined && !required) return;
  if (typeof item !== "string" || item.trim().length === 0) {
    errors.push(key + " must be a non-empty string.");
  }
}

function numberField(
  value: Record<string, unknown>,
  key: string,
  errors: string[],
  required = false,
): void {
  const item = value[key];
  if (item === undefined && !required) return;
  if (typeof item !== "number" || !Number.isFinite(item)) {
    errors.push(key + " must be a finite number.");
  }
}

export function validateTelemetryEvent(
  input: unknown,
  index?: number,
): string[] {
  const errors: string[] = [];
  const prefix = index === undefined ? "Telemetry event" : "Telemetry event " + index;
  if (!isRecord(input)) return [prefix + " must be an object."];

  if (input.schemaVersion !== 1) {
    errors.push(prefix + " schemaVersion must be 1.");
  }
  stringField(input, "eventId", errors);
  stringField(input, "kind", errors);
  if (typeof input.kind === "string" && !KINDS.has(input.kind)) {
    errors.push("kind is unsupported: " + input.kind);
  }
  if (typeof input.producer !== "string" || !PRODUCERS.has(input.producer as TelemetryProducer)) {
    errors.push("producer is invalid.");
  }
  if (!isRecord(input.scope)) {
    errors.push("scope must be an object.");
  }
  numberField(input, "tick", errors);
  if (input.timestamp !== undefined && typeof input.timestamp !== "string") {
    errors.push("timestamp must be a string.");
  }

  switch (input.kind) {
    case "entity-stall":
      stringField(input, "entityKey", errors);
      numberField(input, "stalledTicks", errors);
      numberField(input, "distanceDelta", errors);
      break;
    case "teleport-fallback":
      if (
        typeof input.entityKey !== "string" &&
        typeof input.playerKey !== "string"
      ) {
        errors.push("teleport-fallback requires entityKey or playerKey.");
      }
      break;
    case "arena-double-start":
      stringField(input, "arenaId", errors);
      numberField(input, "arenaGeneration", errors, true);
      break;
    case "stale-callback":
      stringField(input, "subsystem", errors);
      numberField(input, "capturedGeneration", errors);
      numberField(input, "currentGeneration", errors);
      break;
    case "revive-anomaly":
      stringField(input, "targetPlayerKey", errors);
      if (
        ![
          "self-revive",
          "multiple-revivers",
          "stale-revive",
          "revive-after-death",
          "invalid-reviver",
        ].includes(String(input.anomaly))
      ) {
        errors.push("revive-anomaly anomaly is invalid.");
      }
      break;
    case "state-drift":
      stringField(input, "contractId", errors);
      if (!isRecord(input.authority)) errors.push("authority must be an object.");
      if (!isRecord(input.mirror)) errors.push("mirror must be an object.");
      break;
    case "route-revalidation":
      stringField(input, "routeId", errors);
      if (input.result !== "passed" && input.result !== "failed") {
        errors.push("route-revalidation result must be passed or failed.");
      }
      break;
    case "mutation-verification":
      if (input.result !== "passed" && input.result !== "failed") {
        errors.push("mutation-verification result must be passed or failed.");
      }
      break;
  }

  return errors.map((error) => prefix + ": " + error);
}

export function validateTelemetryBatch(input: unknown): string[] {
  if (!isRecord(input)) return ["Telemetry batch must be an object."];
  const errors: string[] = [];
  if (input.schemaVersion !== 1) {
    errors.push("Telemetry batch schemaVersion must be 1.");
  }
  if (!Array.isArray(input.events)) {
    errors.push("Telemetry batch events must be an array.");
    return errors;
  }

  const ids = new Set<string>();
  for (let index = 0; index < input.events.length; index += 1) {
    const event = input.events[index];
    errors.push(...validateTelemetryEvent(event, index));
    if (isRecord(event) && typeof event.eventId === "string") {
      if (ids.has(event.eventId)) {
        errors.push("Duplicate telemetry eventId: " + event.eventId);
      }
      ids.add(event.eventId);
    }
  }
  return errors;
}

export function parseTelemetryBatch(input: unknown): TelemetryBatch {
  const errors = validateTelemetryBatch(input);
  if (errors.length > 0) {
    throw new Error("Invalid telemetry batch: " + errors.join("; "));
  }
  return input as TelemetryBatch;
}

export function telemetryEventKinds(
  events: readonly TelemetryEvent[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event.kind] = (counts[event.kind] ?? 0) + 1;
  }
  return counts;
}
