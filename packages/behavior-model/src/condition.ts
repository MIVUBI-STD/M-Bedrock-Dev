import type {
  BehaviorCondition,
  BehaviorScalar,
  BehaviorState,
} from "./types.js";

function orderedCompare(
  left: BehaviorScalar | undefined,
  right: BehaviorScalar | undefined,
): number | undefined {
  if (
    typeof left === "number" &&
    typeof right === "number"
  ) {
    return left === right ? 0 : left < right ? -1 : 1;
  }
  if (
    typeof left === "string" &&
    typeof right === "string"
  ) {
    return left.localeCompare(right);
  }
  return undefined;
}

export function evaluateBehaviorCondition(
  state: BehaviorState,
  condition: BehaviorCondition,
): boolean {
  const has = Object.prototype.hasOwnProperty.call(
    state.values,
    condition.variableId,
  );
  const actual = state.values[condition.variableId];

  switch (condition.operator) {
    case "exists":
      return has;
    case "missing":
      return !has;
    case "eq":
      return has && actual === condition.value;
    case "neq":
      return !has || actual !== condition.value;
    case "gt": {
      const comparison = orderedCompare(
        actual,
        condition.value,
      );
      return comparison !== undefined && comparison > 0;
    }
    case "gte": {
      const comparison = orderedCompare(
        actual,
        condition.value,
      );
      return comparison !== undefined && comparison >= 0;
    }
    case "lt": {
      const comparison = orderedCompare(
        actual,
        condition.value,
      );
      return comparison !== undefined && comparison < 0;
    }
    case "lte": {
      const comparison = orderedCompare(
        actual,
        condition.value,
      );
      return comparison !== undefined && comparison <= 0;
    }
  }
}
