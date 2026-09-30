import {
  projectPolicyProvenance,
} from "../provenance.js";
import type {
  BehaviorModelFragment,
  BehaviorPredicate,
  BehaviorVariable,
} from "../types.js";

const SPEC =
  "behavior-spec:minecraft-combat-lifecycle-v1";
const provenance = projectPolicyProvenance(
  SPEC,
  "Designed combat/downed/revive lifecycle. Hurt, downed, revive, death, and reward commit remain separate transitions and require runtime/source binding before engine claims.",
);

const VARIABLES: readonly BehaviorVariable[] = [
  {
    id: "combat.life-state",
    scope: "player",
    valueType: "string",
    authority: "script",
    description:
      "Project combat life state: alive, downed, dead, or respawning.",
    provenance,
  },
  {
    id: "combat.life-generation",
    scope: "player",
    valueType: "number",
    authority: "derived",
    description:
      "Monotonic life generation invalidating stale revive/combat work.",
    provenance,
  },
  {
    id: "combat.revive-owner",
    scope: "player",
    valueType: "nullable",
    authority: "script",
    description:
      "Generation-scoped owner of the active revive transaction.",
    provenance,
  },
  {
    id: "combat.revive-verified",
    scope: "player",
    valueType: "boolean",
    authority: "derived",
    description:
      "Whether the active revive transaction satisfied eligibility/current-generation checks.",
    provenance,
  },
  {
    id: "combat.death-confirmed",
    scope: "player",
    valueType: "boolean",
    authority: "engine",
    description:
      "Whether terminal death has been observed for the current life generation.",
    provenance,
  },
  {
    id: "combat.elimination-committed",
    scope: "player",
    valueType: "boolean",
    authority: "script",
    description:
      "Whether elimination/kill side effects were committed idempotently.",
    provenance,
  },
];

function eq(
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

export interface CombatLifecycleBehaviorOptions {
  playerKey: string;
  reviveDeadlineTicks?: number;
}

export function createCombatLifecycleBehavior(
  options: CombatLifecycleBehaviorOptions,
): BehaviorModelFragment {
  const p = options.playerKey;
  const id = (suffix: string) =>
    "minecraft.combat:" + p + ":" + suffix;

  return {
    variables: VARIABLES,
    transitions: [
      {
        id: id("enter-downed"),
        owner: "script",
        preconditions: [
          eq("combat.life-state", p, "alive"),
          eq(
            "combat.death-confirmed",
            p,
            false,
          ),
        ],
        effects: [
          {
            kind: "set",
            variableId: "combat.life-state",
            scopeKey: p,
            value: "downed",
          },
          {
            kind: "set",
            variableId:
              "combat.revive-verified",
            scopeKey: p,
            value: false,
          },
        ],
        provenance,
      },
      {
        id: id("begin-revive"),
        owner: "script",
        preconditions: [
          eq(
            "combat.life-state",
            p,
            "downed",
          ),
          eq(
            "combat.death-confirmed",
            p,
            false,
          ),
          eq(
            "combat.revive-owner",
            p,
            null,
          ),
        ],
        effects: [],
        nondeterminismSurfaces: [
          "event-ordering",
          "network-input-order",
          "death-respawn-order",
        ],
        provenance,
      },
      {
        id: id("commit-revive"),
        owner: "script",
        preconditions: [
          eq(
            "combat.life-state",
            p,
            "downed",
          ),
          eq(
            "combat.death-confirmed",
            p,
            false,
          ),
          eq(
            "combat.revive-verified",
            p,
            true,
          ),
        ],
        effects: [
          {
            kind: "set",
            variableId: "combat.life-state",
            scopeKey: p,
            value: "alive",
          },
          {
            kind: "set",
            variableId:
              "combat.revive-owner",
            scopeKey: p,
            value: null,
          },
        ],
        provenance,
      },
      {
        id: id("confirm-death"),
        owner: "engine",
        preconditions: [],
        effects: [
          {
            kind: "set",
            variableId:
              "combat.death-confirmed",
            scopeKey: p,
            value: true,
          },
          {
            kind: "set",
            variableId: "combat.life-state",
            scopeKey: p,
            value: "dead",
          },
          {
            kind: "set",
            variableId:
              "combat.revive-owner",
            scopeKey: p,
            value: null,
          },
        ],
        nondeterminismSurfaces: [
          "death-respawn-order",
          "event-ordering",
        ],
        provenance,
      },
      {
        id: id("commit-elimination"),
        owner: "script",
        preconditions: [
          eq(
            "combat.life-state",
            p,
            "dead",
          ),
          eq(
            "combat.death-confirmed",
            p,
            true,
          ),
          eq(
            "combat.elimination-committed",
            p,
            false,
          ),
        ],
        effects: [
          {
            kind: "set",
            variableId:
              "combat.elimination-committed",
            scopeKey: p,
            value: true,
          },
        ],
        provenance,
      },
      {
        id: id("respawn"),
        owner: "engine",
        preconditions: [
          eq(
            "combat.life-state",
            p,
            "dead",
          ),
        ],
        effects: [
          {
            kind: "increment",
            variableId:
              "combat.life-generation",
            scopeKey: p,
            amount: 1,
          },
          {
            kind: "set",
            variableId: "combat.life-state",
            scopeKey: p,
            value: "alive",
          },
          {
            kind: "set",
            variableId:
              "combat.death-confirmed",
            scopeKey: p,
            value: false,
          },
          {
            kind: "set",
            variableId:
              "combat.elimination-committed",
            scopeKey: p,
            value: false,
          },
        ],
        provenance,
      },
    ],
    properties: [
      {
        id: id(
          "revive-forbidden-after-death",
        ),
        kind: "always",
        predicate: {
          kind: "implies",
          if: eq(
            "combat.death-confirmed",
            p,
            true,
          ),
          then: {
            kind: "not",
            predicate: eq(
              "combat.life-state",
              p,
              "downed",
            ),
          },
        },
        provenance,
      },
      {
        id: id(
          "elimination-requires-death",
        ),
        kind: "always",
        predicate: {
          kind: "implies",
          if: eq(
            "combat.elimination-committed",
            p,
            true,
          ),
          then: eq(
            "combat.death-confirmed",
            p,
            true,
          ),
        },
        provenance,
      },
      {
        id: id(
          "downed-eventually-resolves",
        ),
        kind: "leads-to",
        trigger: eq(
          "combat.life-state",
          p,
          "downed",
        ),
        consequence: {
          kind: "any",
          predicates: [
            eq(
              "combat.life-state",
              p,
              "alive",
            ),
            eq(
              "combat.life-state",
              p,
              "dead",
            ),
          ],
        },
        ...(options.reviveDeadlineTicks ===
        undefined
          ? {}
          : {
              withinTicks:
                options.reviveDeadlineTicks,
            }),
        provenance,
      },
    ],
  };
}
