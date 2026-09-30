import {
  projectPolicyProvenance,
} from "../provenance.js";
import type {
  BehaviorModelFragment,
  BehaviorPredicate,
  BehaviorVariable,
} from "../types.js";

const SPEC = "behavior-spec:minecraft-inventory-lifecycle-v1";
const provenance = projectPolicyProvenance(
  SPEC,
  "Designed inventory/equipment lifecycle policy promoted from repository inventory knowledge. Runtime engine truth still requires source/knowledge/runtime evidence.",
);

const VARIABLES: readonly BehaviorVariable[] = [
  {
    id: "loadout.phase",
    scope: "player",
    valueType: "string",
    authority: "script",
    description:
      "Generation-scoped loadout transaction phase.",
    provenance,
  },
  {
    id: "loadout.generation",
    scope: "player",
    valueType: "number",
    authority: "script",
    description:
      "Monotonic loadout generation used to reject stale restore/grant work.",
    provenance,
  },
  {
    id: "loadout.inventory-clean",
    scope: "player",
    valueType: "boolean",
    authority: "derived",
    description:
      "Whether scoped inventory container state has been reconciled.",
    provenance,
  },
  {
    id: "loadout.equipment-clean",
    scope: "player",
    valueType: "boolean",
    authority: "derived",
    description:
      "Whether scoped equipment/offhand state has been reconciled.",
    provenance,
  },
  {
    id: "loadout.verified",
    scope: "player",
    valueType: "boolean",
    authority: "derived",
    description:
      "Whether current inventory/equipment matches the intended loadout signature.",
    provenance,
  },
  {
    id: "loadout.restore-owner",
    scope: "player",
    valueType: "nullable",
    authority: "script",
    description:
      "Current generation-scoped owner of restore/grant authority.",
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

export interface InventoryLifecycleBehaviorOptions {
  playerKey: string;
  applyDeadlineTicks?: number;
}

export function createInventoryLifecycleBehavior(
  options: InventoryLifecycleBehaviorOptions,
): BehaviorModelFragment {
  const p = options.playerKey;
  const id = (suffix: string) =>
    "minecraft.inventory:" + p + ":" + suffix;

  return {
    variables: VARIABLES,
    transitions: [
      {
        id: id("begin-reset"),
        owner: "script",
        preconditions: [],
        effects: [
          {
            kind: "increment",
            variableId: "loadout.generation",
            scopeKey: p,
            amount: 1,
          },
          {
            kind: "set",
            variableId: "loadout.phase",
            scopeKey: p,
            value: "resetting",
          },
          {
            kind: "set",
            variableId: "loadout.inventory-clean",
            scopeKey: p,
            value: false,
          },
          {
            kind: "set",
            variableId: "loadout.equipment-clean",
            scopeKey: p,
            value: false,
          },
          {
            kind: "set",
            variableId: "loadout.verified",
            scopeKey: p,
            value: false,
          },
        ],
        nondeterminismSurfaces: [
          "event-ordering",
          "death-respawn-order",
          "network-input-order",
        ],
        provenance,
      },
      {
        id: id("begin-apply"),
        owner: "script",
        preconditions: [
          eq("loadout.phase", p, "resetting"),
          eq("loadout.inventory-clean", p, true),
          eq("loadout.equipment-clean", p, true),
        ],
        effects: [
          {
            kind: "set",
            variableId: "loadout.phase",
            scopeKey: p,
            value: "applying",
          },
        ],
        provenance,
      },
      {
        id: id("begin-verify"),
        owner: "script",
        preconditions: [
          eq("loadout.phase", p, "applying"),
        ],
        effects: [
          {
            kind: "set",
            variableId: "loadout.phase",
            scopeKey: p,
            value: "verifying",
          },
        ],
        provenance,
      },
      {
        id: id("commit"),
        owner: "script",
        preconditions: [
          eq("loadout.phase", p, "verifying"),
          eq("loadout.verified", p, true),
        ],
        effects: [
          {
            kind: "set",
            variableId: "loadout.phase",
            scopeKey: p,
            value: "committed",
          },
        ],
        provenance,
      },
    ],
    properties: [
      {
        id: id("commit-requires-verification"),
        kind: "always",
        predicate: {
          kind: "implies",
          if: eq("loadout.phase", p, "committed"),
          then: eq("loadout.verified", p, true),
        },
        provenance,
      },
      {
        id: id("apply-requires-both-surfaces-clean"),
        kind: "always",
        predicate: {
          kind: "implies",
          if: eq("loadout.phase", p, "applying"),
          then: {
            kind: "all",
            predicates: [
              eq("loadout.inventory-clean", p, true),
              eq("loadout.equipment-clean", p, true),
            ],
          },
        },
        provenance,
      },
      {
        id: id("reset-eventually-commits"),
        kind: "leads-to",
        trigger: eq("loadout.phase", p, "resetting"),
        consequence: eq("loadout.phase", p, "committed"),
        ...(options.applyDeadlineTicks === undefined
          ? {}
          : {
              withinTicks:
                options.applyDeadlineTicks,
            }),
        provenance,
      },
    ],
  };
}
