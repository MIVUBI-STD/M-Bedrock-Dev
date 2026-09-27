import { describe, expect, it } from "vitest";
import {
  validateRuntimeActionCapabilityRegistry,
  validateRuntimeActionInvocation,
  type RuntimeActionCapabilityRegistry,
} from "../src/index.js";

const registry: RuntimeActionCapabilityRegistry = {
  schemaVersion: 1,
  actions: [{
    id: "test.join-arena",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      arenaId: "string",
      playerId: "string",
    },
    optionalParameters: {
      resetProgress: "boolean",
    },
  }],
};

describe("runtime action capability registry", () => {
  it("validates registered action parameters and execution context", () => {
    expect(
      validateRuntimeActionCapabilityRegistry(registry),
    ).toEqual([]);

    expect(
      validateRuntimeActionInvocation(registry, {
        actionId: "test.join-arena",
        phase: "stimulus",
        parameters: {
          arenaId: "a1",
          playerId: "p1",
          resetProgress: true,
        },
        context: "LIVE_MINECRAFT",
        mutationRisk: "guarded",
      }),
    ).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("reports explicit capability gaps instead of permitting arbitrary action ids", () => {
    const result = validateRuntimeActionInvocation(
      registry,
      {
        actionId: "test.disconnect-player",
        phase: "stimulus",
        parameters: {},
        context: "LIVE_MINECRAFT",
        mutationRisk: "mutating",
      },
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(
      /not registered/,
    );
  });

  it("rejects missing or mistyped parameters", () => {
    const result = validateRuntimeActionInvocation(
      registry,
      {
        actionId: "test.join-arena",
        phase: "stimulus",
        parameters: {
          arenaId: 1,
          playerId: "p1",
        },
        context: "LIVE_MINECRAFT",
        mutationRisk: "guarded",
      },
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(
      /arenaId must be string/,
    );
  });
});
