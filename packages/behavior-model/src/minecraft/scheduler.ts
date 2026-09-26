import type {
  BehaviorModelFragment,
  BehaviorVariable,
} from "../types.js";

const VARIABLES: readonly BehaviorVariable[] = [
  {
    id: "callback.owner-generation",
    scope: "subsystem",
    valueType: "number",
    authority: "script",
  },
  {
    id: "callback.current-generation",
    scope: "subsystem",
    valueType: "number",
    authority: "derived",
  },
  {
    id: "callback.mutation-applied",
    scope: "subsystem",
    valueType: "boolean",
    authority: "derived",
  },
];

function eq(
  variableId: string,
  scopeKey: string,
  value: number | boolean,
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

export interface DeferredCallbackBehaviorOptions {
  callbackKey: string;
  generation: number;
}

export function createDeferredCallbackBehavior(
  options: DeferredCallbackBehaviorOptions,
): BehaviorModelFragment {
  const c = options.callbackKey;
  const id = (suffix: string) =>
    "minecraft.callback:" + c + ":" + suffix;

  return {
    variables: VARIABLES,
    properties: [{
      id: id("stale-generation-cannot-mutate"),
      kind: "always",
      predicate: {
        kind: "implies",
        if: {
          kind: "not",
          predicate: eq(
            "callback.current-generation",
            c,
            options.generation,
          ),
        },
        then: eq(
          "callback.mutation-applied",
          c,
          false,
        ),
      },
    }],
  };
}
