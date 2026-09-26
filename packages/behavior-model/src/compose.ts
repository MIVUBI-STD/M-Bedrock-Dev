import type {
  BehavioralWorldModel,
  BehaviorModelFragment,
  BehaviorVariable,
} from "./types.js";

function sameVariable(
  left: BehaviorVariable,
  right: BehaviorVariable,
): boolean {
  return (
    left.id === right.id &&
    left.scope === right.scope &&
    left.valueType === right.valueType &&
    left.authority === right.authority &&
    left.description === right.description
  );
}

export function composeBehavioralWorldModel(
  id: string,
  fragments: readonly BehaviorModelFragment[],
): BehavioralWorldModel {
  const variables = new Map<string, BehaviorVariable>();
  const transitions = [];
  const properties = [];

  for (const fragment of fragments) {
    for (const variable of fragment.variables ?? []) {
      const existing = variables.get(variable.id);
      if (existing && !sameVariable(existing, variable)) {
        throw new Error(
          "Behavior model fragments disagree on variable definition: " +
            variable.id +
            ".",
        );
      }
      variables.set(variable.id, variable);
    }
    transitions.push(...(fragment.transitions ?? []));
    properties.push(...(fragment.properties ?? []));
  }

  return {
    schemaVersion: 1,
    id,
    variables: [...variables.values()].sort(
      (left, right) =>
        left.id.localeCompare(right.id),
    ),
    transitions,
    properties,
  };
}
