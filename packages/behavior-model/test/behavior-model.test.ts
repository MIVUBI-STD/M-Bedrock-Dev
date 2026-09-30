import { describe, expect, it } from "vitest";
import {
  applyBehaviorTransition,
  auditBehaviorModelProvenance,
  behaviorStateKey,
  composeBehavioralWorldModel,
  createArenaLifecycleBehavior,
  createChunkResidencyBehavior,
  createDeferredCallbackBehavior,
  createInventoryLifecycleBehavior,
  createPlayerSessionBehavior,
  resolveSpatialAuthority,
  validateSpatialAuthorityPolicy,
  resolveInventoryItemPolicy,
  validateInventoryItemPolicy,
  planNavigationRecovery,
  validateNavigationRecoveryPolicy,
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
          createArenaLifecycleBehavior({
            arenaKey: "a1",
            capacity: 5,
            resetDeadlineTicks: 40,
          }),
          createInventoryLifecycleBehavior({
            playerKey: "p1",
            applyDeadlineTicks: 40,
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
    expect(
      composed.transitions.some(
        (transition) =>
          transition.id ===
          "minecraft.arena:a1:finish-reset",
      ),
    ).toBe(true);
    expect(
      composed.properties.some(
        (property) =>
          property.id ===
          "minecraft.arena:a1:capacity-never-exceeded",
      ),
    ).toBe(true);
    expect(
      composed.properties.some(
        (property) =>
          property.id ===
          "minecraft.inventory:p1:commit-requires-verification",
      ),
    ).toBe(true);
  });

  it("resolves spatial authority by most-specific authored rule", () => {
    const policy = {
      schemaVersion: 1 as const,
      id: "build-plot-policy",
      rules: [
        {
          id: "deny-default",
          regionId: "build-plot",
          actor: "player" as const,
          action: "*" as const,
          decision: "deny" as const,
        },
        {
          id: "allow-build",
          regionId: "build-plot",
          actor: "player" as const,
          action: "place-block" as const,
          phases: ["building"],
          decision: "allow" as const,
        },
      ],
    };

    expect(
      validateSpatialAuthorityPolicy(policy),
    ).toEqual([]);
    expect(
      resolveSpatialAuthority(policy, {
        regionId: "build-plot",
        actor: "player",
        action: "place-block",
        phase: "building",
      }),
    ).toMatchObject({
      status: "resolved",
      decision: "allow",
      matchedRuleIds: ["allow-build"],
    });
    expect(
      resolveSpatialAuthority(policy, {
        regionId: "build-plot",
        actor: "player",
        action: "break-block",
        phase: "observation",
      }),
    ).toMatchObject({
      status: "resolved",
      decision: "deny",
      matchedRuleIds: ["deny-default"],
    });
  });

  it("fails closed when equally-specific spatial rules disagree", () => {
    const result = resolveSpatialAuthority(
      {
        schemaVersion: 1,
        id: "conflict",
        rules: [
          {
            id: "allow",
            regionId: "plot",
            actor: "player",
            action: "use-item",
            phases: ["building"],
            decision: "allow",
          },
          {
            id: "deny",
            regionId: "plot",
            actor: "player",
            action: "use-item",
            phases: ["building"],
            decision: "deny",
          },
        ],
      },
      {
        regionId: "plot",
        actor: "player",
        action: "use-item",
        phase: "building",
      },
    );

    expect(result.status).toBe("conflict");
    expect(result.decision).toBeUndefined();
  });

  it("resolves exact inventory item ownership before fallback policy", () => {
    const policy = {
      schemaVersion: 1 as const,
      id: "items",
      rules: [
        {
          id: "fallback",
          itemClass: "*",
          ownershipScope: "session" as const,
          dropAllowed: true,
          resetOn: ["lobby-return" as const],
        },
        {
          id: "sword",
          itemClass: "minecraft:diamond_sword",
          ownershipScope: "round" as const,
          dropAllowed: false,
          resetOn: ["round-end" as const],
          restoreOn: ["respawn" as const],
        },
      ],
    };

    expect(
      validateInventoryItemPolicy(policy),
    ).toEqual([]);
    expect(
      resolveInventoryItemPolicy(policy, {
        itemClass: "minecraft:diamond_sword",
      }),
    ).toMatchObject({
      status: "resolved",
      matchedRuleIds: ["sword"],
      rule: {
        ownershipScope: "round",
        dropAllowed: false,
      },
    });
    expect(
      resolveInventoryItemPolicy(policy, {
        itemClass: "minecraft:stone",
      }),
    ).toMatchObject({
      status: "resolved",
      matchedRuleIds: ["fallback"],
    });
  });

  it("fails closed when duplicate exact item policies conflict", () => {
    const result = resolveInventoryItemPolicy(
      {
        schemaVersion: 1,
        id: "conflict",
        rules: [
          {
            id: "one",
            itemClass: "minecraft:bow",
            ownershipScope: "round",
            dropAllowed: false,
            resetOn: ["round-end"],
          },
          {
            id: "two",
            itemClass: "minecraft:bow",
            ownershipScope: "life",
            dropAllowed: true,
            resetOn: ["death"],
          },
        ],
      },
      { itemClass: "minecraft:bow" },
    );

    expect(result.status).toBe("conflict");
    expect(result.rule).toBeUndefined();
  });

  it("escalates navigation recovery only after bounded earlier stages are exhausted", () => {
    const policy = {
      schemaVersion: 1 as const,
      id: "arena-recovery",
      maxRepathAttempts: 1,
      maxAnchorRecoveryAttempts: 1,
      teleportFallbackEnabled: true,
      maxTeleportFallbackAttempts: 1,
    };

    expect(
      validateNavigationRecoveryPolicy(policy),
    ).toEqual([]);

    const base = {
      entityGeneration: 4,
      ownerGeneration: 4,
      stalledConfirmed: true,
      pathAnchorAvailable: true,
      repathAttempts: 0,
      anchorRecoveryAttempts: 0,
      teleportFallbackAttempts: 0,
    };

    const repath =
      planNavigationRecovery(policy, base);
    expect(repath.decision).toBe("repath");

    const anchor =
      planNavigationRecovery(
        policy,
        repath.nextState,
      );
    expect(anchor.decision)
      .toBe("path-anchor-recovery");

    const teleport =
      planNavigationRecovery(
        policy,
        anchor.nextState,
      );
    expect(teleport.decision)
      .toBe("teleport-fallback");

    const terminal =
      planNavigationRecovery(
        policy,
        teleport.nextState,
      );
    expect(terminal.decision)
      .toBe("terminal-stuck");
  });

  it("rejects stale-generation navigation recovery work", () => {
    const result = planNavigationRecovery(
      {
        schemaVersion: 1,
        id: "recovery",
        maxRepathAttempts: 1,
        maxAnchorRecoveryAttempts: 1,
        teleportFallbackEnabled: false,
        maxTeleportFallbackAttempts: 0,
      },
      {
        entityGeneration: 5,
        ownerGeneration: 4,
        stalledConfirmed: true,
        pathAnchorAvailable: true,
        repathAttempts: 0,
        anchorRecoveryAttempts: 0,
        teleportFallbackAttempts: 0,
      },
    );

    expect(result.decision)
      .toBe("stale-generation");
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
