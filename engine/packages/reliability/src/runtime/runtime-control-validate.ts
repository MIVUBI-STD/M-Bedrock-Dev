import type { RuntimeControlPlan } from "./runtime-control.js";

export function validateRuntimeControlPlan(
  plan: RuntimeControlPlan,
): string[] {
  const errors: string[] = [];

  if (plan.schemaVersion !== 1) {
    errors.push("Runtime control plan schemaVersion must be 1.");
  }
  if (!plan.scenarioId.trim()) {
    errors.push("Runtime control plan requires scenarioId.");
  }

  let previousTick = -1;
  for (const [index, entry] of plan.actions.entries()) {
    if (!Number.isInteger(entry.tick) || entry.tick < 0) {
      errors.push(`Action ${index} has invalid tick.`);
    }
    if (entry.tick < previousTick) {
      errors.push("Runtime control actions must be sorted by tick.");
    }
    previousTick = entry.tick;

    const action = entry.action;
    if ("playerId" in action && !action.playerId.trim()) {
      errors.push(`Action ${index} requires playerId.`);
    }
    if ("arenaId" in action && !action.arenaId.trim()) {
      errors.push(`Action ${index} requires arenaId.`);
    }
  }

  return errors;
}
