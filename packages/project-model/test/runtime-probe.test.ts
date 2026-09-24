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

  it("rejects malformed response json", () => {
    expect(() => parseRuntimeProbeResponseJson("{bad-json"))
      .toThrow(/Invalid runtime probe response JSON/);
  });
});
