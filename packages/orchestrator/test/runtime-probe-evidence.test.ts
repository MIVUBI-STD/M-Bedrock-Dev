import { describe, expect, it } from "vitest";
import { runtimeProbeResponseEvidence } from "../src/runtime-probe-evidence.js";

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
      evidence: {
        predicate: "loaded-target-chunk",
        state: "present",
        confidence: "observed",
        scope: { operationId: "mutation-op" },
      },
      value: true,
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
  });
});
