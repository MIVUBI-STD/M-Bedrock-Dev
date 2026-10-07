import type { BlockTickSchedule, ParsedBlockDefinition } from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function intervalRange(value: unknown): readonly [number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const [min, max] = value;
  return typeof min === "number" && Number.isFinite(min) &&
    typeof max === "number" && Number.isFinite(max)
    ? [min, max] as const
    : undefined;
}

export function analyzeBlockAutomation(
  block: ParsedBlockDefinition,
): readonly BlockTickSchedule[] {
  const output: BlockTickSchedule[] = [];

  for (const component of ["minecraft:tick", "minecraft:queued_ticking"] as const) {
    if (!(component in block.components)) continue;
    const data = asRecord(block.components[component]) ?? {};
    const range = intervalRange(data.interval_range);
    const looping = typeof data.looping === "boolean" ? data.looping : undefined;

    output.push({
      component,
      ...(range ? { intervalRange: range } : {}),
      ...(looping === undefined ? {} : { looping }),
      deprecated: component === "minecraft:queued_ticking",
      timingStatus: range && looping !== undefined ? "explicit" : "partial",
      source: block.source,
    });
  }

  return output;
}
