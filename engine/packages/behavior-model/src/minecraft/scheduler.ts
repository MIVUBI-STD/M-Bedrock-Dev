import {
  projectPolicyProvenance,
} from "../provenance.js";
import type {
  BehaviorModelFragment,
  BehaviorVariable,
} from "../types.js";

const provenance = projectPolicyProvenance(
  "behavior-spec:minecraft-scheduler-v1",
  "Designed generation-ownership safety property; scheduler ordering remains host-specific.",
);

const VARIABLES: readonly BehaviorVariable[] = [
  {
    id: "callback.owner-generation",
    scope: "subsystem",
    valueType: "number",
    authority: "script",
    provenance,
  },
  {
    id: "callback.current-generation",
    scope: "subsystem",
    valueType: "number",
    authority: "derived",
    provenance,
  },
  {
    id: "callback.mutation-applied",
    scope: "subsystem",
    valueType: "boolean",
    authority: "derived",
    provenance,
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
    "minecraft.callback:" +
    c +
    ":" +
    suffix;

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
      provenance,
    }],
  };
}
