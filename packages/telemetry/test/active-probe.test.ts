import { describe, expect, it } from "vitest";
import { parseRuntimeProbeRequest } from "../../project-model/src/runtime-probe-validate.js";
import { createActiveRuntimeProbeClient } from "../src/active-probe.js";

describe("active runtime probe client", () => {
  it("inherits scope and tick while preserving explicit outcome mapping", () => {
    const sent: unknown[] = [];
    const client = createActiveRuntimeProbeClient({
      transport: { send: (request) => sent.push(request) },
      baseScope: { subsystemGeneration: 2 },
      scopeProvider: () => ({ arenaId: "arena-1", arenaGeneration: 7 }),
      tickProvider: () => 120,
      requestIdFactory: () => "req-1",
    });

    const request = client.request({
      probeId: "chunk-ready",
      predicate: "target-chunk-loaded",
      query: {
        kind: "chunk-loaded",
        dimension: "overworld",
        location: { x: 32, y: 64, z: 48 },
      },
      outcomeByState: {
        present: "ready",
        absent: "not-ready",
        unknown: "unknown",
      },
    });

    expect(parseRuntimeProbeRequest(request)).toEqual(request);
    expect(request.scope).toEqual({
      subsystemGeneration: 2,
      arenaId: "arena-1",
      arenaGeneration: 7,
    });
    expect(request.runtimeTick).toBe(120);
    expect(sent).toEqual([request]);
  });

  it("lets narrower request scope override inherited scope", () => {
    const client = createActiveRuntimeProbeClient({
      transport: { send: () => undefined },
      baseScope: { arenaId: "arena-1", arenaGeneration: 1 },
      requestIdFactory: () => "req-2",
    });

    const request = client.request({
      probeId: "entity-live",
      predicate: "critical-entity-resolvable",
      scope: { arenaGeneration: 2, entityKey: "entity-1" },
      query: { kind: "entity-resolvable", entityId: "entity-1" },
      outcomeByState: { present: "live", absent: "missing" },
    });

    expect(request.scope).toEqual({
      arenaId: "arena-1",
      arenaGeneration: 2,
      entityKey: "entity-1",
    });
  });
});
