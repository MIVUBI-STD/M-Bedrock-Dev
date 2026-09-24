import type { RuntimeProbeRequest, RuntimeProbeResponse } from "./runtime-probe.js";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateScope(
  value: unknown,
  label: string,
  errors: string[],
): void {
  if (value === undefined) return;
  if (!record(value)) {
    errors.push(label + " must be an object.");
    return;
  }

  for (const key of [
    "arenaId",
    "playerKey",
    "entityKey",
    "operationId",
  ]) {
    const item = value[key];
    if (
      item !== undefined &&
      (typeof item !== "string" || item.trim().length === 0)
    ) {
      errors.push(label + "." + key + " must be a non-empty string.");
    }
  }

  for (const key of [
    "arenaGeneration",
    "connectionGeneration",
    "lifeGeneration",
    "entityGeneration",
    "subsystemGeneration",
  ]) {
    const item = value[key];
    if (
      item !== undefined &&
      (
        typeof item !== "number" ||
        !Number.isInteger(item) ||
        item < 0
      )
    ) {
      errors.push(label + "." + key + " must be a non-negative integer.");
    }
  }
}

export function validateRuntimeProbeRequest(input: unknown): string[] {
  if (!record(input)) return ["Runtime probe request must be an object."];
  const errors: string[] = [];

  if (input.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (!nonEmpty(input.requestId)) errors.push("requestId must be a non-empty string.");
  if (!nonEmpty(input.probeId)) errors.push("probeId must be a non-empty string.");
  if (!nonEmpty(input.predicate)) errors.push("predicate must be a non-empty string.");

  validateScope(input.scope, "scope", errors);

  if (
    input.runtimeTick !== undefined &&
    (!finite(input.runtimeTick) ||
      !Number.isInteger(input.runtimeTick) ||
      input.runtimeTick < 0)
  ) {
    errors.push("runtimeTick must be a non-negative integer.");
  }

  if (!record(input.outcomeByState)) {
    errors.push("outcomeByState must be an object.");
  } else {
    if (!nonEmpty(input.outcomeByState.present)) {
      errors.push("outcomeByState.present must be a non-empty string.");
    }
    if (!nonEmpty(input.outcomeByState.absent)) {
      errors.push("outcomeByState.absent must be a non-empty string.");
    }
    if (
      input.outcomeByState.unknown !== undefined &&
      !nonEmpty(input.outcomeByState.unknown)
    ) {
      errors.push("outcomeByState.unknown must be a non-empty string when provided.");
    }
  }

  if (!record(input.query) || !nonEmpty(input.query.kind)) {
    errors.push("query must contain a supported kind.");
    return errors;
  }

  switch (input.query.kind) {
    case "chunk-loaded":
      if (!nonEmpty(input.query.dimension)) {
        errors.push("chunk-loaded.dimension must be a non-empty string.");
      }
      if (!record(input.query.location)) {
        errors.push("chunk-loaded.location must be an object.");
      } else {
        for (const axis of ["x", "y", "z"] as const) {
          if (!finite(input.query.location[axis])) {
            errors.push("chunk-loaded.location." + axis + " must be finite.");
          }
        }
      }
      break;
    case "entity-resolvable":
      if (!nonEmpty(input.query.entityId)) {
        errors.push("entity-resolvable.entityId must be a non-empty string.");
      }
      break;
    case "tag-present":
      if (
        input.query.subjectKind !== "player" &&
        input.query.subjectKind !== "entity"
      ) {
        errors.push("tag-present.subjectKind must be player or entity.");
      }
      if (!nonEmpty(input.query.subjectId)) {
        errors.push("tag-present.subjectId must be a non-empty string.");
      }
      if (!nonEmpty(input.query.tag)) {
        errors.push("tag-present.tag must be a non-empty string.");
      }
      break;
    case "scoreboard-value":
      if (!nonEmpty(input.query.objectiveId)) {
        errors.push("scoreboard-value.objectiveId must be a non-empty string.");
      }
      if (!nonEmpty(input.query.participant)) {
        errors.push("scoreboard-value.participant must be a non-empty string.");
      }
      if (
        input.query.expected !== undefined &&
        !finite(input.query.expected)
      ) {
        errors.push("scoreboard-value.expected must be finite.");
      }
      break;
    default:
      errors.push("Unsupported runtime probe query kind: " + input.query.kind);
  }

  return errors;
}

export function parseRuntimeProbeRequest(input: unknown): RuntimeProbeRequest {
  const errors = validateRuntimeProbeRequest(input);
  if (errors.length > 0) {
    throw new Error("Invalid runtime probe request: " + errors.join("; "));
  }
  return input as RuntimeProbeRequest;
}


export function validateRuntimeProbeResponse(input: unknown): string[] {
  if (!record(input)) return ["Runtime probe response must be an object."];
  const errors: string[] = [];

  if (input.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (!nonEmpty(input.requestId)) errors.push("requestId must be a non-empty string.");
  if (!nonEmpty(input.probeId)) errors.push("probeId must be a non-empty string.");
  if (
    !finite(input.runtimeTick) ||
    !Number.isInteger(input.runtimeTick) ||
    input.runtimeTick < 0
  ) {
    errors.push("runtimeTick must be a non-negative integer.");
  }
  if (typeof input.ok !== "boolean") errors.push("ok must be boolean.");
  if (
    input.state !== "present" &&
    input.state !== "absent" &&
    input.state !== "unknown"
  ) {
    errors.push("state must be present, absent, or unknown.");
  }
  if (input.outcomeId !== undefined && !nonEmpty(input.outcomeId)) {
    errors.push("outcomeId must be a non-empty string when provided.");
  }

  if (!record(input.evidence)) {
    errors.push("evidence must be an object.");
  } else {
    if (!nonEmpty(input.evidence.predicate)) {
      errors.push("evidence.predicate must be a non-empty string.");
    }
    if (
      input.evidence.state !== "present" &&
      input.evidence.state !== "absent" &&
      input.evidence.state !== "unknown"
    ) {
      errors.push("evidence.state must be present, absent, or unknown.");
    }
    validateScope(input.evidence.scope, "evidence.scope", errors);
    if (
      input.evidence.confidence !== "observed" &&
      input.evidence.confidence !== "derived" &&
      input.evidence.confidence !== "unknown"
    ) {
      errors.push("evidence.confidence is invalid.");
    }
    if (
      typeof input.state === "string" &&
      input.evidence.state !== input.state
    ) {
      errors.push("evidence.state must match response state.");
    }
  }

  if (
    input.value !== undefined &&
    typeof input.value !== "string" &&
    typeof input.value !== "number" &&
    typeof input.value !== "boolean"
  ) {
    errors.push("value must be string, number, or boolean.");
  }
  if (input.error !== undefined && typeof input.error !== "string") {
    errors.push("error must be a string.");
  }

  if (input.ok === false) {
    if (input.state !== "unknown") {
      errors.push("ok=false responses must use unknown state.");
    }
    if (!nonEmpty(input.error)) {
      errors.push("ok=false responses require a non-empty error.");
    }
  }
  if (input.ok === true && input.error !== undefined) {
    errors.push("ok=true responses must not include error.");
  }

  return errors;
}

export function parseRuntimeProbeResponse(input: unknown): RuntimeProbeResponse {
  const errors = validateRuntimeProbeResponse(input);
  if (errors.length > 0) {
    throw new Error("Invalid runtime probe response: " + errors.join("; "));
  }
  return input as RuntimeProbeResponse;
}


export function parseRuntimeProbeResponseJson(
  json: string,
): RuntimeProbeResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch (error) {
    throw new Error(
      "Invalid runtime probe response JSON: " +
        (error instanceof Error ? error.message : String(error)),
    );
  }
  return parseRuntimeProbeResponse(parsed);
}
