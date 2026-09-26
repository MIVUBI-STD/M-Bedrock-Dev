import type {
  BehaviorModelFragment,
  BehaviorPredicate,
  BehaviorVariable,
} from "../types.js";

const VARIABLES: readonly BehaviorVariable[] = [
  {
    id: "player.connected",
    scope: "player",
    valueType: "boolean",
    authority: "engine",
    description:
      "Whether the player is currently connected to the observed host.",
  },
  {
    id: "player.phase",
    scope: "player",
    valueType: "string",
    authority: "script",
    description:
      "Project session lifecycle phase.",
  },
  {
    id: "player.arena",
    scope: "player",
    valueType: "nullable",
    authority: "script",
    description:
      "Arena assignment owned by the project session system.",
  },
  {
    id: "player.progress",
    scope: "player",
    valueType: "number",
    authority: "script",
    description:
      "Project-defined active session progress.",
  },
  {
    id: "player.connection-generation",
    scope: "player",
    valueType: "number",
    authority: "derived",
    description:
      "Monotonic generation distinguishing reconnect lifetimes.",
  },
  {
    id: "arena.ready",
    scope: "arena",
    valueType: "boolean",
    authority: "derived",
    description:
      "Whether the arena prerequisites for starting this player are satisfied.",
  },
];

function condition(
  variableId: string,
  scopeKey: string,
  value: string | number | boolean | null,
): BehaviorPredicate {
  return {
    kind: "condition",
    condition: {
      variableId,
      scopeKey,
      operator: "eq",
      value,
    },
  };
}

export interface PlayerSessionBehaviorOptions {
  playerKey: string;
  arenaKey: string;
  startDeadlineTicks?: number;
}

export function createPlayerSessionBehavior(
  options: PlayerSessionBehaviorOptions,
): BehaviorModelFragment {
  const p = options.playerKey;
  const a = options.arenaKey;
  const id = (suffix: string) =>
    "minecraft.session:" + p + ":" + suffix;

  const playingRequiresConnected: BehaviorPredicate = {
    kind: "implies",
    if: condition("player.phase", p, "playing"),
    then: {
      kind: "all",
      predicates: [
        condition("player.connected", p, true),
        condition("player.arena", p, a),
      ],
    },
  };

  return {
    variables: VARIABLES,
    transitions: [
      {
        id: id("assign"),
        owner: "script",
        preconditions: [
          condition("player.connected", p, true),
        ],
        effects: [
          {
            kind: "set",
            variableId: "player.arena",
            scopeKey: p,
            value: a,
          },
          {
            kind: "set",
            variableId: "player.phase",
            scopeKey: p,
            value: "assigned",
          },
          {
            kind: "set",
            variableId: "player.progress",
            scopeKey: p,
            value: 0,
          },
        ],
      },
      {
        id: id("request-start"),
        owner: "script",
        preconditions: [
          condition("player.connected", p, true),
          condition("player.phase", p, "assigned"),
          condition("player.arena", p, a),
          condition("arena.ready", a, true),
        ],
        effects: [{
          kind: "set",
          variableId: "player.phase",
          scopeKey: p,
          value: "starting",
        }],
        nondeterminismSurfaces: [
          "tick-scheduling",
          "event-ordering",
          "chunk-residency",
        ],
      },
      {
        id: id("begin-playing"),
        owner: "script",
        preconditions: [
          condition("player.connected", p, true),
          condition("player.phase", p, "starting"),
          condition("player.arena", p, a),
        ],
        effects: [{
          kind: "set",
          variableId: "player.phase",
          scopeKey: p,
          value: "playing",
        }],
        nondeterminismSurfaces: [
          "deferred-callback-order",
          "event-ordering",
        ],
      },
      {
        id: id("disconnect"),
        owner: "engine",
        preconditions: [
          condition("player.connected", p, true),
        ],
        effects: [
          {
            kind: "set",
            variableId: "player.connected",
            scopeKey: p,
            value: false,
          },
          {
            kind: "set",
            variableId: "player.phase",
            scopeKey: p,
            value: "assigned",
          },
          {
            kind: "set",
            variableId: "player.progress",
            scopeKey: p,
            value: 0,
          },
          {
            kind: "increment",
            variableId: "player.connection-generation",
            scopeKey: p,
            amount: 1,
          },
        ],
        nondeterminismSurfaces: [
          "network-input-order",
          "event-ordering",
        ],
      },
      {
        id: id("reconnect"),
        owner: "engine",
        preconditions: [
          condition("player.connected", p, false),
        ],
        effects: [
          {
            kind: "set",
            variableId: "player.connected",
            scopeKey: p,
            value: true,
          },
          {
            kind: "set",
            variableId: "player.phase",
            scopeKey: p,
            value: "assigned",
          },
          {
            kind: "set",
            variableId: "player.progress",
            scopeKey: p,
            value: 0,
          },
          {
            kind: "increment",
            variableId: "player.connection-generation",
            scopeKey: p,
            amount: 1,
          },
        ],
        nondeterminismSurfaces: [
          "network-input-order",
          "event-ordering",
        ],
      },
    ],
    properties: [
      {
        id: id("playing-requires-session"),
        kind: "always",
        predicate: playingRequiresConnected,
      },
      {
        id: id("starting-leads-to-playing"),
        kind: "leads-to",
        trigger: condition(
          "player.phase",
          p,
          "starting",
        ),
        consequence: condition(
          "player.phase",
          p,
          "playing",
        ),
        ...(options.startDeadlineTicks === undefined
          ? {}
          : {
              withinTicks:
                options.startDeadlineTicks,
            }),
      },
      {
        id: id("disconnect-resets-progress"),
        kind: "always",
        predicate: {
          kind: "implies",
          if: condition(
            "player.connected",
            p,
            false,
          ),
          then: condition(
            "player.progress",
            p,
            0,
          ),
        },
      },
    ],
  };
}
