import { describe, expect, it } from "vitest";
import {
  applyBehaviorTransition,
  auditBehaviorModelProvenance,
  behaviorStateKey,
  composeBehavioralWorldModel,
  createChunkResidencyBehavior,
  createDeferredCallbackBehavior,
  createPlayerSessionBehavior,
  evaluateTemporalProperty,
  unknownNondeterminismCapabilityProfile,
  validateBehavioralWorldModel,
  validateNondeterminismCapabilityProfile,
  type BehavioralWorldModel,
  type BehaviorTrace,
} from "../src/index.js";

const c = (
  variableId: string,
  value: string | number | boolean | null,
) => ({
  kind: "condition" as const,
  condition: {
    variableId,
    operator: "eq" as const,
    value,
  },
});

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
      c("player.phase", "assigned"),
      c("arena.ready", true),
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
      id: "connected",
      kind: "always",
      predicate: c(
        "player.connected",
        true,
      ),
    },
    {
      id: "start-eventually-playing",
      kind: "leads-to",
      trigger: c(
        "player.phase",
        "starting",
      ),
      consequence: c(
        "player.phase",
        "playing",
      ),
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

    expect(
      evaluateTemporalProperty(
        trace,
        model.properties[1]!,
      ).disposition,
    ).toBe("violated");
  });

  it("keeps scoped player state isolated", () => {
    const p1 = behaviorStateKey(
      "player.phase",
      "player:p1",
    );
    const p2 = behaviorStateKey(
      "player.phase",
      "player:p2",
    );

    expect(p1).not.toBe(p2);
  });

  it("composes minecraft overlays with explicit designed provenance", () => {
    const composed =
      composeBehavioralWorldModel(
        "two-player",
        [
          createPlayerSessionBehavior({
            playerKey: "p1",
            arenaKey: "a1",
            startDeadlineTicks: 20,
          }),
          createPlayerSessionBehavior({
            playerKey: "p2",
            arenaKey: "a1",
            startDeadlineTicks: 20,
          }),
          createChunkResidencyBehavior(
            "overworld:0:0",
          ),
          createDeferredCallbackBehavior({
            callbackKey: "arena:a1:start",
            generation: 2,
          }),
        ],
      );

    expect(
      composed.variables.filter(
        (item) =>
          item.id === "player.phase",
      ),
    ).toHaveLength(1);
    expect(
      validateBehavioralWorldModel(composed),
    ).toEqual([]);
    expect(
      auditBehaviorModelProvenance(composed),
    ).toEqual([]);
    expect(
      composed.properties.every(
        (property) =>
          property.provenance
            ?.evidenceCeiling === "designed",
      ),
    ).toBe(true);
  });

  it("reports provenance gaps instead of silently trusting unbound claims", () => {
    expect(
      auditBehaviorModelProvenance(model)
        .length,
    ).toBeGreaterThan(0);
  });

  it("keeps unproven runtime nondeterminism capabilities unknown", () => {
    const profile =
      unknownNondeterminismCapabilityProfile(
        "education-host",
        [
          "event-ordering",
          "chunk-residency",
        ],
      );

    expect(
      validateNondeterminismCapabilityProfile(
        profile,
      ),
    ).toEqual([]);
    expect(
      profile.surfaces["event-ordering"]
        ?.replayable,
    ).toBe("unknown");
  });
});
