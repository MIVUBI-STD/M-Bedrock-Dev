import type {
  RuntimeProbeBinding,
  RuntimeProbeBindingSet,
  RuntimeProbeRequest,
  RuntimeProbeRequestBundle,
  RuntimeProbeResponse,
  RuntimeProbeTranscript,
} from "./runtime-probe.js";
import { runtimeScopeContains } from "./runtime-evidence.js";

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


function expectedOutcomeId(
  request: RuntimeProbeRequest,
  state: RuntimeProbeResponse["state"],
): string | undefined {
  if (state === "present") return request.outcomeByState.present;
  if (state === "absent") return request.outcomeByState.absent;
  return request.outcomeByState.unknown;
}

export function validateRuntimeProbeExchange(
  requestInput: unknown,
  responseInput: unknown,
): string[] {
  const errors: string[] = [];
  const requestErrors = validateRuntimeProbeRequest(requestInput);
  const responseErrors = validateRuntimeProbeResponse(responseInput);

  errors.push(...requestErrors.map((error) => "request: " + error));
  errors.push(...responseErrors.map((error) => "response: " + error));

  if (requestErrors.length > 0 || responseErrors.length > 0) {
    return errors;
  }

  const request = requestInput as RuntimeProbeRequest;
  const response = responseInput as RuntimeProbeResponse;

  if (response.requestId !== request.requestId) {
    errors.push("requestId mismatch.");
  }
  if (response.probeId !== request.probeId) {
    errors.push("probeId mismatch.");
  }
  if (response.evidence.predicate !== request.predicate) {
    errors.push("evidence predicate mismatch.");
  }
  if (
    !runtimeScopeContains(
      response.evidence.scope,
      request.scope,
    )
  ) {
    errors.push("evidence scope mismatch.");
  }
  if (
    request.runtimeTick !== undefined &&
    response.runtimeTick < request.runtimeTick
  ) {
    errors.push("response runtimeTick precedes request runtimeTick.");
  }

  const expectedOutcome = expectedOutcomeId(request, response.state);
  if (response.ok) {
    if (response.outcomeId !== expectedOutcome) {
      errors.push("outcomeId does not match request outcome mapping.");
    }
  } else if (response.outcomeId !== undefined) {
    errors.push("failed response must not include outcomeId.");
  }

  if (
    response.evidence.observedAt?.tick !== undefined &&
    response.evidence.observedAt.tick !== response.runtimeTick
  ) {
    errors.push(
      "evidence observedAt.tick must match response runtimeTick.",
    );
  }

  if (
    response.ok &&
    response.evidence.confidence !== "observed"
  ) {
    errors.push("successful response evidence must be observed.");
  }
  if (
    !response.ok &&
    response.evidence.confidence !== "unknown"
  ) {
    errors.push("failed response evidence must have unknown confidence.");
  }

  return errors;
}

export function parseRuntimeProbeExchange(
  requestInput: unknown,
  responseInput: unknown,
): {
  request: RuntimeProbeRequest;
  response: RuntimeProbeResponse;
} {
  const errors = validateRuntimeProbeExchange(
    requestInput,
    responseInput,
  );
  if (errors.length > 0) {
    throw new Error(
      "Invalid runtime probe exchange: " + errors.join("; "),
    );
  }
  return {
    request: requestInput as RuntimeProbeRequest,
    response: responseInput as RuntimeProbeResponse,
  };
}

export function validateRuntimeProbeTranscript(
  input: unknown,
): string[] {
  if (!record(input)) {
    return ["Runtime probe transcript must be an object."];
  }

  const errors: string[] = [];
  if (input.schemaVersion !== 1) {
    errors.push("Runtime probe transcript schemaVersion must be 1.");
  }
  if (
    input.sessionId !== undefined &&
    !nonEmpty(input.sessionId)
  ) {
    errors.push("Runtime probe transcript sessionId must be a non-empty string.");
  }
  if (
    input.artifactId !== undefined &&
    !nonEmpty(input.artifactId)
  ) {
    errors.push("Runtime probe transcript artifactId must be a non-empty string.");
  }
  if (
    input.droppedExchanges !== undefined &&
    (
      !finite(input.droppedExchanges) ||
      !Number.isInteger(input.droppedExchanges) ||
      input.droppedExchanges < 0
    )
  ) {
    errors.push(
      "Runtime probe transcript droppedExchanges must be a non-negative integer.",
    );
  }
  if (!Array.isArray(input.exchanges)) {
    errors.push("Runtime probe transcript exchanges must be an array.");
    return errors;
  }

  const requestIds = new Set<string>();

  for (let index = 0; index < input.exchanges.length; index += 1) {
    const rawExchange = input.exchanges[index];
    const prefix = "Runtime probe exchange " + index;
    if (!record(rawExchange)) {
      errors.push(prefix + " must be an object.");
      continue;
    }

    const exchangeErrors = validateRuntimeProbeExchange(
      rawExchange.request,
      rawExchange.response,
    );
    errors.push(
      ...exchangeErrors.map((error) => prefix + ": " + error),
    );

    const request = record(rawExchange.request) &&
      typeof rawExchange.request.requestId === "string"
      ? rawExchange.request as unknown as RuntimeProbeRequest
      : undefined;

    if (request) {
      if (requestIds.has(request.requestId)) {
        errors.push(
          prefix + " duplicates requestId " + request.requestId + ".",
        );
      }
      requestIds.add(request.requestId);
    }
  }

  return errors;
}

export function parseRuntimeProbeTranscript(
  input: unknown,
): RuntimeProbeTranscript {
  const errors = validateRuntimeProbeTranscript(input);
  if (errors.length > 0) {
    throw new Error(
      "Invalid runtime probe transcript: " + errors.join("; "),
    );
  }
  return input as RuntimeProbeTranscript;
}

export function parseRuntimeProbeTranscriptJson(
  json: string,
): RuntimeProbeTranscript {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch (error) {
    throw new Error(
      "Invalid runtime probe transcript JSON: " +
        (error instanceof Error ? error.message : String(error)),
    );
  }
  return parseRuntimeProbeTranscript(parsed);
}


export function validateRuntimeProbeBinding(
  input: unknown,
  index?: number,
): string[] {
  const prefix = index === undefined
    ? "Runtime probe binding"
    : "Runtime probe binding " + index;

  if (!record(input)) return [prefix + " must be an object."];

  const errors: string[] = [];
  if (!nonEmpty(input.probeId)) {
    errors.push(prefix + ".probeId must be a non-empty string.");
  }
  if (!nonEmpty(input.predicate)) {
    errors.push(prefix + ".predicate must be a non-empty string.");
  }
  if (
    input.incidentId !== undefined &&
    !nonEmpty(input.incidentId)
  ) {
    errors.push(
      prefix + ".incidentId must be a non-empty string when provided.",
    );
  }

  validateScope(input.scope, prefix + ".scope", errors);

  const syntheticRequest = {
    schemaVersion: 1,
    requestId: "binding-validation",
    probeId: input.probeId,
    predicate: input.predicate,
    ...(input.scope === undefined ? {} : { scope: input.scope }),
    query: input.query,
    outcomeByState: input.outcomeByState,
  };

  const requestErrors = validateRuntimeProbeRequest(syntheticRequest);
  for (const error of requestErrors) {
    if (
      error.startsWith("requestId") ||
      error.startsWith("probeId") ||
      error.startsWith("predicate") ||
      error.startsWith("scope.")
    ) {
      continue;
    }
    errors.push(prefix + ": " + error);
  }

  return errors;
}

export function parseRuntimeProbeBinding(
  input: unknown,
): RuntimeProbeBinding {
  const errors = validateRuntimeProbeBinding(input);
  if (errors.length > 0) {
    throw new Error(
      "Invalid runtime probe binding: " + errors.join("; "),
    );
  }
  return input as RuntimeProbeBinding;
}

export function validateRuntimeProbeBindingSet(
  input: unknown,
): string[] {
  if (!record(input)) {
    return ["Runtime probe binding set must be an object."];
  }

  const errors: string[] = [];
  if (input.schemaVersion !== 1) {
    errors.push("Runtime probe binding set schemaVersion must be 1.");
  }
  if (!Array.isArray(input.bindings)) {
    errors.push("Runtime probe binding set bindings must be an array.");
    return errors;
  }

  const keys = new Set<string>();
  for (let index = 0; index < input.bindings.length; index += 1) {
    const binding = input.bindings[index];
    errors.push(...validateRuntimeProbeBinding(binding, index));

    if (record(binding) && nonEmpty(binding.probeId)) {
      const incidentId = nonEmpty(binding.incidentId)
        ? binding.incidentId
        : "*";
      const key = incidentId + "\u0000" + binding.probeId;
      if (keys.has(key)) {
        errors.push(
          "Duplicate runtime probe binding for incident/probe: " +
          incidentId +
          " / " +
          binding.probeId,
        );
      }
      keys.add(key);
    }
  }

  return errors;
}

export function parseRuntimeProbeBindingSet(
  input: unknown,
): RuntimeProbeBindingSet {
  const errors = validateRuntimeProbeBindingSet(input);
  if (errors.length > 0) {
    throw new Error(
      "Invalid runtime probe binding set: " + errors.join("; "),
    );
  }
  return input as RuntimeProbeBindingSet;
}


export function validateRuntimeProbeRequestBundle(
  input: unknown,
): string[] {
  if (!record(input)) {
    return ["Runtime probe request bundle must be an object."];
  }

  const errors: string[] = [];
  if (input.schemaVersion !== 1) {
    errors.push("Runtime probe request bundle schemaVersion must be 1.");
  }
  if (
    input.sessionId !== undefined &&
    !nonEmpty(input.sessionId)
  ) {
    errors.push(
      "Runtime probe request bundle sessionId must be a non-empty string.",
    );
  }
  if (
    input.artifactId !== undefined &&
    !nonEmpty(input.artifactId)
  ) {
    errors.push(
      "Runtime probe request bundle artifactId must be a non-empty string.",
    );
  }

  if (
    input.incidentIds !== undefined &&
    !Array.isArray(input.incidentIds)
  ) {
    errors.push("Runtime probe request bundle incidentIds must be an array.");
  } else {
    const incidentIds = new Set<string>();
    for (const raw of input.incidentIds ?? []) {
      if (!nonEmpty(raw)) {
        errors.push(
          "Runtime probe request bundle incidentIds must contain non-empty strings.",
        );
        continue;
      }
      if (incidentIds.has(raw)) {
        errors.push(
          "Duplicate runtime probe request bundle incidentId: " + raw,
        );
      }
      incidentIds.add(raw);
    }
  }

  if (!Array.isArray(input.requests)) {
    errors.push("Runtime probe request bundle requests must be an array.");
    return errors;
  }

  const requestIds = new Set<string>();
  for (let index = 0; index < input.requests.length; index += 1) {
    const request = input.requests[index];
    const requestErrors = validateRuntimeProbeRequest(request);
    errors.push(
      ...requestErrors.map(
        (error) =>
          "Runtime probe request bundle request " +
          index +
          ": " +
          error,
      ),
    );

    if (record(request) && nonEmpty(request.requestId)) {
      if (requestIds.has(request.requestId)) {
        errors.push(
          "Duplicate runtime probe request bundle requestId: " +
          request.requestId,
        );
      }
      requestIds.add(request.requestId);
    }
  }

  return errors;
}

export function parseRuntimeProbeRequestBundle(
  input: unknown,
): RuntimeProbeRequestBundle {
  const errors = validateRuntimeProbeRequestBundle(input);
  if (errors.length > 0) {
    throw new Error(
      "Invalid runtime probe request bundle: " + errors.join("; "),
    );
  }
  return input as RuntimeProbeRequestBundle;
}
