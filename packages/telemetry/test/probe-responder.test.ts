import { describe, expect, it } from "vitest";
import {
  createRuntimeProbeResponder,
} from "../src/probe-responder.js";

const baseRequest = {
  schemaVersion: 1 as const,
  requestId: "req-1",
  probeId: "chunk-ready",
  predicate: "loaded-target-chunk",
  scope: { operationId: "mutation-op" },
  runtimeTick: 90,
  query: {
    kind: "chunk-loaded" as const,
    dimension: "overworld",
    location: { x: 32, y: 64, z: 48 },
  },
  outcomeByState: {
    present: "ready",
    absent: "not-ready",
    unknown: "unknown",
  },
};

describe("runtime probe host responder", () => {
  it("builds observed present evidence from a host resolver", () => {
    const responder = createRuntimeProbeResponder({
      currentTick: () => 100,
      chunkLoaded: () => true,
    });

    const response = responder.respond(baseRequest);

    expect(response).toEqual(expect.objectContaining({
      requestId: "req-1",
      probeId: "chunk-ready",
      runtimeTick: 100,
      ok: true,
      state: "present",
      outcomeId: "ready",
      value: true,
      evidence: expect.objectContaining({
        predicate: "loaded-target-chunk",
        state: "present",
        confidence: "observed",
        scope: { operationId: "mutation-op" },
        observedAt: { tick: 100 },
      }),
    }));
  });

  it("maps false and unavailable boolean resolver results to absent and unknown", () => {
    const absent = createRuntimeProbeResponder({
      currentTick: () => 100,
      entityResolvable: () => false,
    }).respond({
      ...baseRequest,
      requestId: "req-2",
      probeId: "entity-live",
      predicate: "critical-entity-resolvable",
      query: {
        kind: "entity-resolvable",
        entityId: "entity-1",
      },
    });

    expect(absent.state).toBe("absent");
    expect(absent.outcomeId).toBe("not-ready");

    const unknown = createRuntimeProbeResponder({
      currentTick: () => 101,
    }).respond({
      ...baseRequest,
      requestId: "req-3",
    });

    expect(unknown).toEqual(expect.objectContaining({
      ok: true,
      state: "unknown",
      outcomeId: "unknown",
    }));
  });

  it("compares scoreboard values against an expected value", () => {
    const responder = createRuntimeProbeResponder({
      currentTick: () => 40,
      scoreboardValue: () => 3,
    });

    const response = responder.respond({
      ...baseRequest,
      requestId: "req-score",
      predicate: "score-is-five",
      query: {
        kind: "scoreboard-value",
        objectiveId: "phase",
        participant: "arena-1",
        expected: 5,
      },
    });

    expect(response.state).toBe("absent");
    expect(response.value).toBe(3);
  });

  it("fails closed to unknown when a resolver throws", () => {
    const responder = createRuntimeProbeResponder({
      currentTick: () => 50,
      tagPresent: () => {
        throw new Error("entity invalid");
      },
    });

    const response = responder.respond({
      ...baseRequest,
      requestId: "req-error",
      predicate: "tag-ready",
      query: {
        kind: "tag-present",
        subjectKind: "entity",
        subjectId: "entity-1",
        tag: "ready",
      },
    });

    expect(response).toEqual(expect.objectContaining({
      ok: false,
      state: "unknown",
      error: "entity invalid",
      evidence: expect.objectContaining({
        state: "unknown",
        confidence: "unknown",
      }),
    }));
  });

  it("fails closed when currentTick is invalid", () => {
    const responder = createRuntimeProbeResponder({
      currentTick: () => -1,
      chunkLoaded: () => true,
    });

    const response = responder.respond(baseRequest);

    expect(response.ok).toBe(false);
    expect(response.state).toBe("unknown");
    expect(response.runtimeTick).toBe(90);
    expect(response.error).toMatch(/invalid tick/);
  });
});
