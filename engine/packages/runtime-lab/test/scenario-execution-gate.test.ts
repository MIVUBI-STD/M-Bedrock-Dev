import { describe, expect, it, vi } from "vitest";
import type {
  CounterexampleScenario,
  RuntimeActionCapabilityRegistry,
} from "../src/index.js";
import {
  assertCounterexampleScenarioReady,
  executeCounterexampleScenarioWithGate,
} from "../src/index.js";

const scenario: CounterexampleScenario = {
  schemaVersion: 1,
  id: "gated",
  modelId: "m",
  queryId: "q",
  runtimeStatus: "runtime-bound",
  steps: [{
    index: 1,
    transitionId: "join",
    transitionOwner: "player",
    instruction: "Join arena.",
    runtimeBinding: {
      transitionId: "join",
      actionId: "test.join-arena",
      phase: "stimulus",
      parameters: {
        arenaId: "a1",
        playerId: "p1",
      },
    },
  }],
  assertion: {
    queryId: "q",
    instruction: "Check invariant.",
    runtimeBinding: {
      actionId: "probe.scoreboard-value",
      parameters: {
        objectiveId: "members",
        participant: "a1",
      },
    },
  },
  runtimeProtocol: [{
    id: "repro-01",
    phase: "stimulus",
    actionId: "test.join-arena",
    parameters: {
      arenaId: "a1",
      playerId: "p1",
    },
  }, {
    id: "assert-counterexample",
    phase: "observe",
    actionId: "probe.scoreboard-value",
    parameters: {
      objectiveId: "members",
      participant: "a1",
    },
  }],
  replayTrace: [],
};

const capabilities: RuntimeActionCapabilityRegistry = {
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
  }, {
    id: "probe.scoreboard-value",
    requiredContext: "LOCAL_MINECRAFT",
    mutationRisk: "read-only",
    phases: ["observe"],
    requiredParameters: {
      objectiveId: "string",
      participant: "string",
    },
  }],
};

describe("counterexample scenario execution gate", () => {
  it("executes only when preflight is READY_TO_EXECUTE", async () => {
    const execute = vi.fn(async () => ({
      ok: true,
    }));

    const result =
      await executeCounterexampleScenarioWithGate(
        {
          scenario,
          announcedCapabilities: capabilities,
          context: "LIVE_MINECRAFT",
          mutationRisk: "guarded",
          runtimeProfileMatches: true,
        },
        { execute },
      );

    expect(result.status).toBe("executed");
    expect(result.plan.readiness).toBe(
      "READY_TO_EXECUTE",
    );
    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.result).toEqual({ ok: true });
  });

  it("blocks before executor invocation on capability gaps", async () => {
    const execute = vi.fn(async () => ({
      ok: true,
    }));

    const result =
      await executeCounterexampleScenarioWithGate(
        {
          scenario,
          announcedCapabilities: {
            schemaVersion: 1,
            actions: [],
          },
          context: "LIVE_MINECRAFT",
          mutationRisk: "guarded",
          runtimeProfileMatches: true,
        },
        { execute },
      );

    expect(result.status).toBe("blocked");
    expect(result.plan.readiness).toBe(
      "CAPABILITY_GAP",
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it("blocks before executor invocation when assertion observation capability is missing", async () => {
    const execute = vi.fn(async () => ({
      ok: true,
    }));

    const result =
      await executeCounterexampleScenarioWithGate(
        {
          scenario,
          announcedCapabilities: {
            schemaVersion: 1,
            actions: [
              capabilities.actions[0]!,
            ],
          },
          context: "LIVE_MINECRAFT",
          mutationRisk: "guarded",
          runtimeProfileMatches: true,
        },
        { execute },
      );

    expect(result.status).toBe("blocked");
    expect(result.plan.readiness).toBe(
      "CAPABILITY_GAP",
    );
    expect(result.plan.missingActionIds).toEqual([
      "probe.scoreboard-value",
    ]);
    expect(execute).not.toHaveBeenCalled();
  });

  it("blocks profile mismatch before executor invocation", async () => {
    const execute = vi.fn(async () => true);

    const result =
      await executeCounterexampleScenarioWithGate(
        {
          scenario,
          announcedCapabilities: capabilities,
          context: "LIVE_MINECRAFT",
          mutationRisk: "guarded",
          runtimeProfileMatches: false,
        },
        { execute },
      );

    expect(result.status).toBe("blocked");
    expect(result.plan.readiness).toBe(
      "RUNTIME_PROFILE_MISMATCH",
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it("produces a structured blocking error when strict readiness is required", () => {
    expect(() =>
      assertCounterexampleScenarioReady({
        scenarioId: "gated",
        readiness: "CAPABILITY_GAP",
        requiredActions: [],
        missingActionIds: ["test.join-arena"],
        validationErrors: [],
        reasons: ["Missing runtime actions."],
      })
    ).toThrow(
      /CAPABILITY_GAP.*test\.join-arena/,
    );
  });
});
