import {
  projectPolicyProvenance,
} from "../provenance.js";
import type {
  BehaviorModelFragment,
  BehaviorPredicate,
  BehaviorVariable,
} from "../types.js";

const SPEC = "behavior-spec:minecraft-arena-lifecycle-v1";
const provenance = projectPolicyProvenance(
  SPEC,
  "Designed arena lifecycle semantics. This is a reusable project model, not a claim about Minecraft engine behavior without source or runtime evidence.",
);

const VARIABLES: readonly BehaviorVariable[] = [
  {
    id: "arena.phase",
    scope: "arena",
    valueType: "string",
    authority: "script",
    description:
      "Project-owned arena lifecycle phase.",
    provenance,
  },
  {
    id: "arena.generation",
    scope: "arena",
    valueType: "number",
    authority: "script",
    description:
      "Monotonic arena lifecycle generation used to invalidate stale work across resets.",
    provenance,
  },
  {
    id: "arena.member-count",
    scope: "arena",
    valueType: "number",
    authority: "derived",
    description:
      "Current committed participant count.",
    provenance,
  },
  {
    id: "arena.cleanup-complete",
    scope: "arena",
    valueType: "boolean",
    authority: "derived",
    description:
      "Whether resources owned by the previous arena generation have converged to their terminal cleanup state.",
    provenance,
  },
];

function eq(
  variableId: string,
  scopeKey: string,
  value: string | number | boolean,
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

function lte(
  variableId: string,
  scopeKey: string,
  value: number,
): BehaviorPredicate {
  return {
    kind: "condition",
    condition: {
      variableId,
      scopeKey,
      operator: "lte",
      value,
    },
  };
}

export interface ArenaLifecycleBehaviorOptions {
  arenaKey: string;
  capacity?: number;
  resetDeadlineTicks?: number;
}

export function createArenaLifecycleBehavior(
  options: ArenaLifecycleBehaviorOptions,
): BehaviorModelFragment {
  const a = options.arenaKey;
  const id = (suffix: string) =>
    "minecraft.arena:" + a + ":" + suffix;

  const capacityPredicate =
    options.capacity === undefined
      ? undefined
      : lte(
          "arena.member-count",
          a,
          options.capacity,
        );

  return {
    variables: VARIABLES,
    transitions: [
      {
        id: id("prepare"),
        owner: "script",
        preconditions: [
          eq("arena.phase", a, "idle"),
          eq("arena.cleanup-complete", a, true),
        ],
        effects: [
          {
            kind: "set",
            variableId: "arena.phase",
            scopeKey: a,
            value: "preparing",
          },
        ],
        provenance,
      },
      {
        id: id("start"),
        owner: "script",
        preconditions: [
          eq("arena.phase", a, "preparing"),
          ...(capacityPredicate === undefined
            ? []
            : [capacityPredicate]),
        ],
        effects: [
          {
            kind: "set",
            variableId: "arena.phase",
            scopeKey: a,
            value: "running",
          },
        ],
        nondeterminismSurfaces: [
          "event-ordering",
          "tick-scheduling",
          "network-input-order",
        ],
        provenance,
      },
      {
        id: id("begin-ending"),
        owner: "script",
        preconditions: [
          eq("arena.phase", a, "running"),
        ],
        effects: [
          {
            kind: "set",
            variableId: "arena.phase",
            scopeKey: a,
            value: "ending",
          },
          {
            kind: "set",
            variableId: "arena.cleanup-complete",
            scopeKey: a,
            value: false,
          },
        ],
        provenance,
      },
      {
        id: id("begin-reset"),
        owner: "script",
        preconditions: [
          eq("arena.phase", a, "ending"),
        ],
        effects: [
          {
            kind: "set",
            variableId: "arena.phase",
            scopeKey: a,
            value: "resetting",
          },
          {
            kind: "increment",
            variableId: "arena.generation",
            scopeKey: a,
            amount: 1,
          },
        ],
        provenance,
      },
      {
        id: id("finish-reset"),
        owner: "script",
        preconditions: [
          eq("arena.phase", a, "resetting"),
          eq("arena.cleanup-complete", a, true),
          eq("arena.member-count", a, 0),
        ],
        effects: [
          {
            kind: "set",
            variableId: "arena.phase",
            scopeKey: a,
            value: "idle",
          },
        ],
        provenance,
      },
    ],
    properties: [
      ...(capacityPredicate === undefined
        ? []
        : [{
            id: id("capacity-never-exceeded"),
            kind: "always" as const,
            predicate: capacityPredicate,
            provenance,
          }]),
      {
        id: id("running-requires-clean-generation"),
        kind: "always",
        predicate: {
          kind: "implies",
          if: eq("arena.phase", a, "running"),
          then: eq(
            "arena.cleanup-complete",
            a,
            true,
          ),
        },
        provenance,
      },
      {
        id: id("reset-converges-to-idle"),
        kind: "leads-to",
        trigger: eq("arena.phase", a, "resetting"),
        consequence: eq("arena.phase", a, "idle"),
        ...(options.resetDeadlineTicks === undefined
          ? {}
          : {
              withinTicks:
                options.resetDeadlineTicks,
            }),
        provenance,
      },
    ],
  };
}
