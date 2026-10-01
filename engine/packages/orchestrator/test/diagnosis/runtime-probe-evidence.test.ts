import { describe, expect, it } from "vitest";
import { runtimeProbeResponseEvidence } from "../../src/diagnosis/runtime-probe-evidence.js";

describe("runtime probe response evidence", () => {
  it("normalizes response evidence and summarizes states", () => {
    const result = runtimeProbeResponseEvidence([{
      schemaVersion: 1,
      requestId: "req-present",
      probeId: "chunk",
      runtimeTick: 100,
      ok: true,
      state: "present",
      outcomeId: "ready",
      statePath: "session.phase",
      evidence: {
        predicate: "loaded-target-chunk",
        state: "present",
        confidence: "observed",
        scope: { operationId: "mutation-op" },
      },
      value: "active",
    }, {
      schemaVersion: 1,
      requestId: "req-failed",
      probeId: "entity",
      runtimeTick: 101,
      ok: false,
      state: "unknown",
      evidence: {
        predicate: "critical-entity-resolvable",
        state: "unknown",
        confidence: "unknown",
        scope: { entityKey: "entity-1" },
      },
      error: "entity unavailable",
    }]);

    expect(result.summary).toEqual({
      responses: 2,
      present: 1,
      absent: 0,
      unknown: 1,
      failed: 1,
    });
    expect(result.records[0]).toEqual(expect.objectContaining({
      predicate: "loaded-target-chunk",
      observedAt: { tick: 100 },
      relatedNodeIds: expect.arrayContaining([
        "runtime-probe-response:req-present",
        "runtime-probe-outcome:ready",
      ]),
    }));
    expect(result.records[1]).toEqual(expect.objectContaining({
      confidence: "unknown",
      observedAt: { tick: 101 },
    }));
    expect(result.stateObservations).toEqual([
      {
        path: "session.phase",
        value: "active",
        confidence: "observed",
        origin: "runtime-probe",
        scope: { operationId: "mutation-op" },
        observedAt: { tick: 100 },
        evidenceId: "runtime-probe-state:req-present",
      },
    ]);
    expect(
      result.routeChunkAvailabilityObservations,
    ).toEqual([]);
  });

  it("extracts typed route chunk availability observations", () => {
    const loaded = runtimeProbeResponseEvidence([{
      schemaVersion: 1,
      requestId:
        "route-stall::telemetry-stall:stall-225::chunk-route-availability",
      probeId: "gameplay-route-chunk-availability",
      runtimeTick: 226,
      ok: true,
      state: "present",
      outcomeId: "route-target-chunk-loaded",
      evidence: {
        predicate: "route-target-chunk-loaded",
        state: "present",
        confidence: "observed",
        scope: {
          arenaId: "arena_6",
          arenaGeneration: 3,
          entityKey: "demo:zombie",
        },
      },
    }]);

    expect(
      loaded.routeChunkAvailabilityObservations,
    ).toEqual([{
      requestId:
        "route-stall::telemetry-stall:stall-225::chunk-route-availability",
      state: "loaded",
      scope: {
        arenaId: "arena_6",
        arenaGeneration: 3,
        entityKey: "demo:zombie",
      },
      observedAt: { tick: 226 },
      evidenceId:
        "runtime-probe-route-chunk:route-stall::telemetry-stall:stall-225::chunk-route-availability",
    }]);

    const notLoaded = runtimeProbeResponseEvidence([{
      schemaVersion: 1,
      requestId:
        "route-stall::telemetry-stall:stall-225::chunk-route-availability",
      probeId: "gameplay-route-chunk-availability",
      runtimeTick: 226,
      ok: true,
      state: "absent",
      outcomeId: "route-target-chunk-not-loaded",
      evidence: {
        predicate: "route-target-chunk-loaded",
        state: "absent",
        confidence: "observed",
      },
    }]);

    expect(
      notLoaded.routeChunkAvailabilityObservations[0]?.state,
    ).toBe("not-loaded");

    const unknown = runtimeProbeResponseEvidence([{
      schemaVersion: 1,
      requestId:
        "route-stall::telemetry-stall:stall-225::chunk-route-availability",
      probeId: "gameplay-route-chunk-availability",
      runtimeTick: 226,
      ok: false,
      state: "unknown",
      evidence: {
        predicate: "route-target-chunk-loaded",
        state: "unknown",
        confidence: "unknown",
      },
      error: "probe unavailable",
    }]);

    expect(
      unknown.routeChunkAvailabilityObservations[0]?.state,
    ).toBe("unknown");
  });
});
