import type { EntityStateCandidate } from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function collectEvents(value: unknown, output: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectEvents(item, output);
    return;
  }
  const record = asRecord(value);
  if (!record) return;

  if (typeof record.event === "string") output.add(record.event);
  for (const nested of Object.values(record)) collectEvents(nested, output);
}

export interface SensorSemantics {
  component: string;
  emittedEvents: string[];
  hasFilters: boolean;
  capabilities: string[];
}

export function extractSensorSemantics(
  state: EntityStateCandidate,
): SensorSemantics[] {
  const output: SensorSemantics[] = [];

  for (const component of [
    "minecraft:environment_sensor",
    "minecraft:entity_sensor",
  ]) {
    if (!state.activeComponents.includes(component)) continue;
    const config = asRecord(state.activeComponentData[component]) ?? {};
    const emitted = new Set<string>();
    collectEvents(config, emitted);

    const text = JSON.stringify(config);
    const hasFilters =
      text.includes('"filters"') ||
      text.includes('"event_filters"');

    output.push({
      component,
      emittedEvents: [...emitted].sort(),
      hasFilters,
      capabilities: [
        "sensor:event-emitter",
        ...(emitted.size > 0 ? ["sensor:configured-event"] : []),
        ...(hasFilters ? ["sensor:filtered"] : []),
      ],
    });
  }

  return output;
}
