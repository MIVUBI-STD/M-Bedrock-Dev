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
  "mutation-applied",
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

function validateScope(scope: Record<string, unknown>, errors: string[]): void {
  for (const key of [
    "arenaId",
    "playerKey",
    "entityKey",
    "operationId",
  ]) {
    const value = scope[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim().length === 0)
    ) {
      errors.push("scope." + key + " must be a non-empty string.");
    }
  }

  for (const key of [
    "arenaGeneration",
    "connectionGeneration",
    "lifeGeneration",
    "entityGeneration",
    "subsystemGeneration",
  ]) {
    const value = scope[key];
    if (
      value !== undefined &&
      (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < 0
      )
    ) {
      errors.push("scope." + key + " must be a non-negative integer.");
    }
  }
}

function validStateValue(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "boolean"
  );
}

function validateStateSurface(
  value: unknown,
  label: string,
  errors: string[],
): void {
  if (!isRecord(value)) {
    errors.push(label + " must be an object.");
    return;
  }
  const kinds = new Set([
    "scoreboard",
    "tag",
    "dynamic-property",
    "entity-property",
    "inventory",
    "script-memory",
  ]);
  if (typeof value.kind !== "string" || !kinds.has(value.kind)) {
    errors.push(label + ".kind is invalid.");
  }
  if (typeof value.key !== "string" || value.key.trim().length === 0) {
    errors.push(label + ".key must be a non-empty string.");
  }
}

function validateStateEndpoint(
  value: unknown,
  label: string,
  errors: string[],
): void {
  if (!isRecord(value)) {
    errors.push(label + " must be an object.");
    return;
  }
  validateStateSurface(value.surface, label + ".surface", errors);
  if (!validStateValue(value.value)) {
    errors.push(label + ".value must be a scalar or null.");
  }
  if (
    value.revision !== undefined &&
    (
      typeof value.revision !== "number" ||
      !Number.isInteger(value.revision) ||
      value.revision < 0
    )
  ) {
    errors.push(label + ".revision must be a non-negative integer.");
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
  } else {
    validateScope(input.scope, errors);
  }
  numberField(input, "tick", errors);
  numberField(input, "sequence", errors);
  if (
    typeof input.sequence === "number" &&
    (!Number.isInteger(input.sequence) || input.sequence < 0)
  ) {
    errors.push("sequence must be a non-negative integer.");
  }
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
      if (
        typeof input.capturedGeneration === "number" &&
        typeof input.currentGeneration === "number" &&
        input.capturedGeneration === input.currentGeneration
      ) {
        errors.push("stale-callback generations must differ when both are provided.");
      }
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
      if (
        input.anomaly === "self-revive" &&
        (
          typeof input.reviverPlayerKey !== "string" ||
          input.reviverPlayerKey !== input.targetPlayerKey
        )
      ) {
        errors.push(
          "self-revive requires reviverPlayerKey to match targetPlayerKey.",
        );
      }
      break;
    case "state-drift":
      stringField(input, "contractId", errors);
      validateStateEndpoint(input.authority, "authority", errors);
      validateStateEndpoint(input.mirror, "mirror", errors);
      break;
    case "route-revalidation":
      stringField(input, "routeId", errors);
      if (input.result !== "passed" && input.result !== "failed") {
        errors.push("route-revalidation result must be passed or failed.");
      }
      break;
    case "mutation-applied":
      if (
        ![
          "structure-load",
          "fill",
          "setblock",
          "clone",
          "script-block-write",
          "other",
        ].includes(String(input.mutationKind))
      ) {
        errors.push("mutation-applied mutationKind is invalid.");
      }
      if (
        input.routeId !== undefined &&
        (typeof input.routeId !== "string" || input.routeId.trim().length === 0)
      ) {
        errors.push("mutation-applied routeId must be a non-empty string.");
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
  if (
    input.artifactId !== undefined &&
    (
      typeof input.artifactId !== "string" ||
      input.artifactId.trim().length === 0
    )
  ) {
    errors.push("Telemetry batch artifactId must be a non-empty string.");
  }
  if (
    input.sessionId !== undefined &&
    (
      typeof input.sessionId !== "string" ||
      input.sessionId.trim().length === 0
    )
  ) {
    errors.push("Telemetry batch sessionId must be a non-empty string.");
  }
  if (
    input.droppedEvents !== undefined &&
    (
      typeof input.droppedEvents !== "number" ||
      !Number.isInteger(input.droppedEvents) ||
      input.droppedEvents < 0
    )
  ) {
    errors.push("Telemetry batch droppedEvents must be a non-negative integer.");
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
