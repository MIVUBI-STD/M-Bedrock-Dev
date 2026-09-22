import type { RuntimeControlPlan, TimedRuntimeControlAction } from "./runtime-control.js";

export const RUNTIME_CONTROL_PREFIX = "[M-BEDROCK-CTRL]";

export function serializeRuntimeControlPlan(
  plan: RuntimeControlPlan,
): string {
  return JSON.stringify(plan);
}

export function serializeRuntimeControlAction(
  scenarioId: string,
  entry: TimedRuntimeControlAction,
): string {
  return `${RUNTIME_CONTROL_PREFIX}${JSON.stringify({
    schemaVersion: 1,
    scenarioId,
    tick: entry.tick,
    action: entry.action,
  })}`;
}
