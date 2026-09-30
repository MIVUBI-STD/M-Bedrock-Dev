import { describe, expect, it } from "vitest";
import type {
  RuntimeProbeBackend,
  RuntimeProbeLookup,
} from "../src/runtime-probe-executor.js";
import { createRuntimeProbeExecutor } from "../src/index.js";

function backend(overrides: Partial<RuntimeProbeBackend> = {}): RuntimeProbeBackend {
  return {
    currentTick: 100,
    chunkLoaded: () => ({ status: "value", value: true }),
    entityResolvable: () => ({ status: "value", value: true }),
    tagPresent: () => ({ status: "value", value: true }),
    scoreboardValue: () => ({ status: "value", value: 5 }),
    ...overrides,
  };
}

function request(
  query: Parameters<RuntimeProbeBackend["chunkLoaded"]> extends never
    ? never
    : any,
) {
  return {
    schemaVersion: 1 as const,
    requestId: "req-1",
    probeId: "probe-1",
    predicate: "runtime-proof",
    scope: {
      arenaId: "arena-1",
      arenaGeneration: 4,
      operationId: "operation-1",
    },
    runtimeTick: 90,
    query,
    outcomeByState: {
      present: "yes",
      absent: "no",
      unknown: "unknown",
    },
  };
}

describe("runtime probe executor", () => {
  it("executes chunk-loaded probes as observed evidence", () => {
    const executor = createRuntimeProbeExecutor(backend());
    const response = executor.execute(request({
      kind: "chunk-loaded",
      dimension: "overworld",
      location: { x: 16, y: 64, z: 16 },
    }));

    expect(response).toMatchObject({
      runtimeTick: 100,
      ok: true,
      state: "present",
      outcomeId: "yes",
      value: true,
      evidence: {
        predicate: "runtime-proof",
        state: "present",
        confidence: "observed",
        scope: {
          arenaId: "arena-1",
          arenaGeneration: 4,
          operationId: "operation-1",
        },
        observedAt: { tick: 100 },
      },
    });
  });

  it("executes entity and tag probes", () => {
    const executor = createRuntimeProbeExecutor(backend({
      entityResolvable: () => ({ status: "value", value: false }),
      tagPresent: () => ({ status: "missing" }),
    }));

    const entity = executor.execute(request({
      kind: "entity-resolvable",
      entityId: "entity-1",
    }));
    expect(entity.state).toBe("absent");
    expect(entity.value).toBe(false);

    const tag = executor.execute(request({
      kind: "tag-present",
      subjectKind: "player",
      subjectId: "player-a",
      tag: "ready",
    }));
    expect(tag.state).toBe("absent");
  });

  it("compares scoreboard values against an expected value", () => {
    const executor = createRuntimeProbeExecutor(backend({
      scoreboardValue: () => ({ status: "value", value: 7 }),
    }));

    const matching = executor.execute(request({
      kind: "scoreboard-value",
      objectiveId: "phase",
      participant: "arena-1",
      expected: 7,
    }));
    expect(matching.state).toBe("present");
    expect(matching.value).toBe(7);

    const mismatching = executor.execute(request({
      kind: "scoreboard-value",
      objectiveId: "phase",
      participant: "arena-1",
      expected: 8,
    }));
    expect(mismatching.state).toBe("absent");
    expect(mismatching.value).toBe(7);
  });

  it("turns backend unknown into a failed unknown response", () => {
    const executor = createRuntimeProbeExecutor(backend({
      chunkLoaded: (): RuntimeProbeLookup<boolean> => ({
        status: "unknown",
        error: "dimension unavailable",
      }),
    }));

    const response = executor.execute(request({
      kind: "chunk-loaded",
      dimension: "custom",
      location: { x: 0, y: 64, z: 0 },
    }));

    expect(response).toMatchObject({
      ok: false,
      state: "unknown",
      error: "dimension unavailable",
      evidence: {
        confidence: "unknown",
        state: "unknown",
      },
    });
  });

  it("converts backend exceptions into unknown evidence instead of throwing", () => {
    const executor = createRuntimeProbeExecutor(backend({
      entityResolvable() {
        throw new Error("entity reference invalid");
      },
    }));

    const response = executor.execute(request({
      kind: "entity-resolvable",
      entityId: "entity-1",
    }));

    expect(response.ok).toBe(false);
    expect(response.state).toBe("unknown");
    expect(response.error).toMatch(/entity reference invalid/);
  });
});
