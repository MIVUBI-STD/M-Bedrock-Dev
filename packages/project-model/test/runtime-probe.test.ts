import { describe, expect, it } from "vitest";
import {
  parseRuntimeProbeRequest,
  parseRuntimeProbeResponseJson,
  validateRuntimeProbeRequest,
  validateRuntimeProbeResponse,
} from "../src/runtime-probe-validate.js";

describe("runtime probe contracts", () => {
  it("accepts bounded typed probe requests", () => {
    expect(parseRuntimeProbeRequest({
      schemaVersion: 1,
      requestId: "req-1",
      probeId: "chunk-ready",
      predicate: "target-chunk-loaded",
      query: {
        kind: "chunk-loaded",
        dimension: "overworld",
        location: { x: 0, y: 64, z: 0 },
      },
      outcomeByState: {
        present: "ready",
        absent: "not-ready",
      },
    }).query.kind).toBe("chunk-loaded");
  });

  it("rejects arbitrary execution query kinds", () => {
    expect(validateRuntimeProbeRequest({
      schemaVersion: 1,
      requestId: "req-unsafe",
      probeId: "unsafe",
      predicate: "unsafe",
      query: {
        kind: "command",
        command: "kill @e",
      },
      outcomeByState: {
        present: "yes",
        absent: "no",
      },
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("Unsupported runtime probe query kind"),
    ]));
  });

  it("parses a valid response and requires evidence state consistency", () => {
    const response = parseRuntimeProbeResponseJson(JSON.stringify({
      schemaVersion: 1,
      requestId: "req-1",
      probeId: "chunk-ready",
      runtimeTick: 100,
      ok: true,
      state: "present",
      outcomeId: "ready",
      evidence: {
        predicate: "target-chunk-loaded",
        state: "present",
        confidence: "observed",
      },
      value: true,
    }));

    expect(response.outcomeId).toBe("ready");

    expect(validateRuntimeProbeResponse({
      ...response,
      state: "absent",
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("evidence.state must match response state"),
    ]));
  });

  it("validates request and evidence scopes", () => {
    expect(validateRuntimeProbeRequest({
      schemaVersion: 1,
      requestId: "req-scope",
      probeId: "chunk-ready",
      predicate: "target-chunk-loaded",
      scope: {
        arenaId: "",
        arenaGeneration: -1,
      },
      query: {
        kind: "chunk-loaded",
        dimension: "overworld",
        location: { x: 0, y: 64, z: 0 },
      },
      outcomeByState: {
        present: "ready",
        absent: "not-ready",
      },
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("scope.arenaId"),
      expect.stringContaining("scope.arenaGeneration"),
    ]));

    expect(validateRuntimeProbeResponse({
      schemaVersion: 1,
      requestId: "req-scope",
      probeId: "chunk-ready",
      runtimeTick: 100,
      ok: true,
      state: "present",
      outcomeId: "ready",
      evidence: {
        predicate: "target-chunk-loaded",
        state: "present",
        confidence: "observed",
        scope: {
          operationId: "",
          entityGeneration: -1,
        },
      },
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("evidence.scope.operationId"),
      expect.stringContaining("evidence.scope.entityGeneration"),
    ]));
  });

  it("requires failed probes to return unknown state with an error", () => {
    expect(validateRuntimeProbeResponse({
      schemaVersion: 1,
      requestId: "req-failed",
      probeId: "chunk-ready",
      runtimeTick: 100,
      ok: false,
      state: "absent",
      evidence: {
        predicate: "target-chunk-loaded",
        state: "absent",
        confidence: "unknown",
      },
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("ok=false responses must use unknown state"),
      expect.stringContaining("require a non-empty error"),
    ]));

    expect(validateRuntimeProbeResponse({
      schemaVersion: 1,
      requestId: "req-ok",
      probeId: "chunk-ready",
      runtimeTick: 100,
      ok: true,
      state: "present",
      evidence: {
        predicate: "target-chunk-loaded",
        state: "present",
        confidence: "observed",
      },
      error: "should-not-exist",
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("ok=true responses must not include error"),
    ]));
  });

  it("rejects malformed response json", () => {
    expect(() => parseRuntimeProbeResponseJson("{bad-json"))
      .toThrow(/Invalid runtime probe response JSON/);
  });
});
