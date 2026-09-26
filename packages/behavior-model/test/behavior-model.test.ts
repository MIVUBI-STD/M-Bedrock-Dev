import { describe, expect, it } from "vitest";
import {
  applyBehaviorTransition,
  evaluateTemporalProperty,
  validateBehavioralWorldModel,
  type BehavioralWorldModel,
  type BehaviorTrace,
} from "../src/index.js";

const model: BehavioralWorldModel = {
  schemaVersion: 1,
  id: "session-core",
  variables: [
    {
      id: "player.phase",
      scope: "player",
      valueType: "string",
      authority: "script",
    },
    {
      id: "player.connected",
      scope: "player",
      valueType: "boolean",
      authority: "engine",
    },
    {
      id: "arena.ready",
      scope: "arena",
      valueType: "boolean",
      authority: "derived",
    },
  ],
  transitions: [{
    id: "start-player",
    owner: "script",
    preconditions: [
      {
        variableId: "player.phase",
        operator: "eq",
        value: "assigned",
      },
      {
        variableId: "arena.ready",
        operator: "eq",
        value: true,
      },
    ],
    effects: [{
      kind: "set",
      variableId: "player.phase",
      value: "starting",
    }],
    nondeterminismSurfaces: [
      "tick-scheduling",
      "event-ordering",
    ],
  }],
  properties: [
    {
      id: "connected-while-starting",
      kind: "always",
      condition: {
        variableId: "player.connected",
        operator: "eq",
        value: true,
      },
    },
    {
      id: "start-eventually-playing",
      kind: "leads-to",
      trigger: {
        variableId: "player.phase",
        operator: "eq",
        value: "starting",
      },
      consequence: {
        variableId: "player.phase",
        operator: "eq",
        value: "playing",
      },
      withinTicks: 20,
    },
  ],
};

describe("behavioral world model", () => {
  it("validates variable references and temporal properties", () => {
    expect(
      validateBehavioralWorldModel(model),
    ).toEqual([]);
  });

  it("executes a deterministic transition only when preconditions hold", () => {
    const result = applyBehaviorTransition(
      {
        schemaVersion: 1,
        tick: 10,
        values: {
          "player.phase": "assigned",
          "player.connected": true,
          "arena.ready": true,
        },
      },
      model.transitions[0]!,
    );

    expect(result.enabled).toBe(true);
    expect(
      result.state.values["player.phase"],
    ).toBe("starting");
    expect(result.changedVariables).toEqual([
      "player.phase",
    ]);
  });

  it("keeps incomplete liveness evidence unknown", () => {
    const trace: BehaviorTrace = {
      schemaVersion: 1,
      complete: false,
      states: [{
        schemaVersion: 1,
        tick: 0,
        values: {
          "player.phase": "starting",
          "player.connected": true,
          "arena.ready": true,
        },
      }, {
        schemaVersion: 1,
        tick: 10,
        values: {
          "player.phase": "starting",
          "player.connected": true,
          "arena.ready": true,
        },
      }],
    };

    expect(
      evaluateTemporalProperty(
        trace,
        model.properties[1]!,
      ).disposition,
    ).toBe("unknown");
  });

  it("fails a bounded leads-to property after its deadline", () => {
    const trace: BehaviorTrace = {
      schemaVersion: 1,
      complete: false,
      states: [{
        schemaVersion: 1,
        tick: 0,
        values: {
          "player.phase": "starting",
          "player.connected": true,
          "arena.ready": true,
        },
      }, {
        schemaVersion: 1,
        tick: 20,
        values: {
          "player.phase": "starting",
          "player.connected": true,
          "arena.ready": true,
        },
      }],
    };

    const result = evaluateTemporalProperty(
      trace,
      model.properties[1]!,
    );
    expect(result.disposition).toBe("violated");
    expect(result.witnessTicks).toEqual([0, 20]);
  });

  it("does not call a clean incomplete safety prefix proven", () => {
    const trace: BehaviorTrace = {
      schemaVersion: 1,
      complete: false,
      states: [{
        schemaVersion: 1,
        tick: 0,
        values: {
          "player.phase": "assigned",
          "player.connected": true,
          "arena.ready": true,
        },
      }],
    };

    expect(
      evaluateTemporalProperty(
        trace,
        model.properties[0]!,
      ).disposition,
    ).toBe("unknown");
  });
});
