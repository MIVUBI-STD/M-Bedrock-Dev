import type {
  BehaviorModelFragment,
  BehaviorVariable,
} from "../types.js";

const VARIABLES: readonly BehaviorVariable[] = [
  {
    id: "entity.resolvable",
    scope: "entity",
    valueType: "boolean",
    authority: "engine",
  },
  {
    id: "entity.alive",
    scope: "entity",
    valueType: "boolean",
    authority: "engine",
  },
  {
    id: "entity.owner-generation",
    scope: "entity",
    valueType: "number",
    authority: "script",
  },
  {
    id: "entity.navigation-active",
    scope: "entity",
    valueType: "boolean",
    authority: "engine",
  },
  {
    id: "entity.navigation-generation",
    scope: "entity",
    valueType: "number",
    authority: "derived",
  },
];

function eq(
  variableId: string,
  scopeKey: string,
  value: string | number | boolean | null,
) {
  return {
    kind: "condition" as const,
    condition: {
      variableId,
      scopeKey,
      operator: "eq" as const,
      value,
    },
  };
}

export interface EntityLifecycleBehaviorOptions {
  entityKey: string;
}

export function createEntityLifecycleBehavior(
  options: EntityLifecycleBehaviorOptions,
): BehaviorModelFragment {
  const e = options.entityKey;
  const id = (suffix: string) =>
    "minecraft.entity:" + e + ":" + suffix;

  return {
    variables: VARIABLES,
    transitions: [
      {
        id: id("despawn"),
        owner: "engine",
        preconditions: [
          eq("entity.resolvable", e, true),
        ],
        effects: [
          {
            kind: "set",
            variableId: "entity.resolvable",
            scopeKey: e,
            value: false,
          },
          {
            kind: "set",
            variableId: "entity.alive",
            scopeKey: e,
            value: false,
          },
          {
            kind: "set",
            variableId:
              "entity.navigation-active",
            scopeKey: e,
            value: false,
          },
        ],
        nondeterminismSurfaces: [
          "entity-tick-order",
          "chunk-residency",
        ],
      },
      {
        id: id("navigation-replan"),
        owner: "engine",
        preconditions: [
          eq("entity.resolvable", e, true),
          eq("entity.alive", e, true),
        ],
        effects: [{
          kind: "increment",
          variableId:
            "entity.navigation-generation",
          scopeKey: e,
          amount: 1,
        }],
        nondeterminismSurfaces: [
          "pathfinding",
          "ai-goal-arbitration",
          "entity-tick-order",
        ],
      },
    ],
    properties: [{
      id: id("navigation-requires-live-entity"),
      kind: "always",
      predicate: {
        kind: "implies",
        if: eq(
          "entity.navigation-active",
          e,
          true,
        ),
        then: {
          kind: "all",
          predicates: [
            eq("entity.resolvable", e, true),
            eq("entity.alive", e, true),
          ],
        },
      },
    }],
  };
}
