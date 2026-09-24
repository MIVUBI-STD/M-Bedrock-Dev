import type {
  RuntimeProbeQuery,
  RuntimeProbeRequest,
  RuntimeProbeResponse,
  RuntimeProbeState,
} from "../../project-model/src/runtime-probe.js";
import { parseRuntimeProbeRequest } from "../../project-model/src/runtime-probe-validate.js";

export type RuntimeProbeLookup<T> =
  | { status: "value"; value: T }
  | { status: "missing" }
  | { status: "unknown"; error?: string };

export interface RuntimeProbeBackend {
  readonly currentTick: number;
  chunkLoaded(
    dimension: string,
    location: { x: number; y: number; z: number },
  ): RuntimeProbeLookup<boolean>;
  entityResolvable(entityId: string): RuntimeProbeLookup<boolean>;
  tagPresent(
    subjectKind: "player" | "entity",
    subjectId: string,
    tag: string,
  ): RuntimeProbeLookup<boolean>;
  scoreboardValue(
    objectiveId: string,
    participant: string,
  ): RuntimeProbeLookup<number>;
}

export interface RuntimeProbeExecutor {
  execute(request: RuntimeProbeRequest): RuntimeProbeResponse;
}

function outcomeId(
  request: RuntimeProbeRequest,
  state: RuntimeProbeState,
): string | undefined {
  if (state === "present") return request.outcomeByState.present;
  if (state === "absent") return request.outcomeByState.absent;
  return request.outcomeByState.unknown;
}

function successfulResponse(
  request: RuntimeProbeRequest,
  tick: number,
  state: "present" | "absent",
  value?: string | number | boolean,
): RuntimeProbeResponse {
  return {
    schemaVersion: 1,
    requestId: request.requestId,
    probeId: request.probeId,
    runtimeTick: tick,
    ok: true,
    state,
    outcomeId: outcomeId(request, state),
    evidence: {
      predicate: request.predicate,
      state,
      confidence: "observed",
      ...(request.scope === undefined
        ? {}
        : { scope: request.scope }),
      observedAt: { tick },
      relatedNodeIds: [
        "runtime-probe-request:" + request.requestId,
        "runtime-probe:" + request.probeId,
      ],
    },
    ...(value === undefined ? {} : { value }),
  };
}

function unknownResponse(
  request: RuntimeProbeRequest,
  tick: number,
  error: string,
): RuntimeProbeResponse {
  return {
    schemaVersion: 1,
    requestId: request.requestId,
    probeId: request.probeId,
    runtimeTick: tick,
    ok: false,
    state: "unknown",
    evidence: {
      predicate: request.predicate,
      state: "unknown",
      confidence: "unknown",
      ...(request.scope === undefined
        ? {}
        : { scope: request.scope }),
      observedAt: { tick },
      relatedNodeIds: [
        "runtime-probe-request:" + request.requestId,
        "runtime-probe:" + request.probeId,
      ],
    },
    error,
  };
}

function booleanLookup(
  request: RuntimeProbeRequest,
  tick: number,
  result: RuntimeProbeLookup<boolean>,
): RuntimeProbeResponse {
  if (result.status === "unknown") {
    return unknownResponse(
      request,
      tick,
      result.error ?? "Runtime probe backend returned unknown.",
    );
  }
  if (result.status === "missing") {
    return successfulResponse(request, tick, "absent", false);
  }
  return successfulResponse(
    request,
    tick,
    result.value ? "present" : "absent",
    result.value,
  );
}

function scoreboardLookup(
  request: RuntimeProbeRequest,
  query: Extract<RuntimeProbeQuery, { kind: "scoreboard-value" }>,
  tick: number,
  result: RuntimeProbeLookup<number>,
): RuntimeProbeResponse {
  if (result.status === "unknown") {
    return unknownResponse(
      request,
      tick,
      result.error ?? "Scoreboard value unavailable.",
    );
  }
  if (result.status === "missing") {
    return successfulResponse(request, tick, "absent");
  }

  const present =
    query.expected === undefined ||
    result.value === query.expected;
  return successfulResponse(
    request,
    tick,
    present ? "present" : "absent",
    result.value,
  );
}

export function createRuntimeProbeExecutor(
  backend: RuntimeProbeBackend,
): RuntimeProbeExecutor {
  return {
    execute(rawRequest) {
      const request = parseRuntimeProbeRequest(rawRequest);
      const tick = backend.currentTick;

      try {
        switch (request.query.kind) {
          case "chunk-loaded":
            return booleanLookup(
              request,
              tick,
              backend.chunkLoaded(
                request.query.dimension,
                request.query.location,
              ),
            );
          case "entity-resolvable":
            return booleanLookup(
              request,
              tick,
              backend.entityResolvable(request.query.entityId),
            );
          case "tag-present":
            return booleanLookup(
              request,
              tick,
              backend.tagPresent(
                request.query.subjectKind,
                request.query.subjectId,
                request.query.tag,
              ),
            );
          case "scoreboard-value":
            return scoreboardLookup(
              request,
              request.query,
              tick,
              backend.scoreboardValue(
                request.query.objectiveId,
                request.query.participant,
              ),
            );
        }
      } catch (error) {
        return unknownResponse(
          request,
          tick,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}
