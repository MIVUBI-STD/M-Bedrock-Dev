import type { EntityStateCandidate } from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function numberValue(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  return typeof record[key] === "number" ? record[key] as number : undefined;
}

function boolValue(
  record: Record<string, unknown>,
  key: string,
): boolean | undefined {
  return typeof record[key] === "boolean" ? record[key] as boolean : undefined;
}

function collectFamilyFilters(
  value: unknown,
  output: Set<string>,
): void {
  if (Array.isArray(value)) {
    for (const item of value) collectFamilyFilters(item, output);
    return;
  }

  const record = asRecord(value);
  if (!record) return;

  if (
    record.test === "is_family" &&
    typeof record.value === "string"
  ) {
    output.add(record.value);
  }

  for (const nested of Object.values(record)) {
    collectFamilyFilters(nested, output);
  }
}

export interface TargetTypeSemantics {
  families: string[];
  maxDist?: number;
  mustSee?: boolean;
  reevaluateDescription?: boolean;
}

export interface TargetingSemantics {
  component: string;
  configuredTargetTypes: number;
  families: string[];
  targetTypes: TargetTypeSemantics[];
  mustSee?: boolean;
  mustReach?: boolean;
  withinRadius?: number;
  reselectTargets?: boolean;
  capabilities: string[];
}

const TARGET_COMPONENTS = new Set([
  "minecraft:behavior.nearest_attackable_target",
  "minecraft:behavior.nearest_prioritized_attackable_target",
]);

export function extractTargetingSemantics(
  state: EntityStateCandidate,
): TargetingSemantics[] {
  const results: TargetingSemantics[] = [];

  for (const component of state.activeComponents) {
    if (!TARGET_COMPONENTS.has(component)) continue;

    const config = asRecord(state.activeComponentData[component]) ?? {};
    const rawTypes = Array.isArray(config.entity_types)
      ? config.entity_types
      : [];

    const allFamilies = new Set<string>();
    const targetTypes: TargetTypeSemantics[] = rawTypes.map((entry) => {
      const item = asRecord(entry) ?? {};
      const families = new Set<string>();
      collectFamilyFilters(item.filters, families);
      for (const family of families) allFamilies.add(family);

      return {
        families: [...families].sort(),
        ...(numberValue(item, "max_dist") !== undefined
          ? { maxDist: numberValue(item, "max_dist") }
          : {}),
        ...(boolValue(item, "must_see") !== undefined
          ? { mustSee: boolValue(item, "must_see") }
          : {}),
        ...(boolValue(item, "reevaluate_description") !== undefined
          ? { reevaluateDescription: boolValue(item, "reevaluate_description") }
          : {}),
      };
    });

    const capabilities: string[] = [];
    if (rawTypes.length > 0) {
      capabilities.push("targeting:configured-entity-types");
      capabilities.push("targeting:provider");
    }
    for (const family of allFamilies) {
      capabilities.push(`targeting:family:${family}`);
    }

    results.push({
      component,
      configuredTargetTypes: rawTypes.length,
      families: [...allFamilies].sort(),
      targetTypes,
      ...(boolValue(config, "must_see") !== undefined
        ? { mustSee: boolValue(config, "must_see") }
        : {}),
      ...(boolValue(config, "must_reach") !== undefined
        ? { mustReach: boolValue(config, "must_reach") }
        : {}),
      ...(numberValue(config, "within_radius") !== undefined
        ? { withinRadius: numberValue(config, "within_radius") }
        : {}),
      ...(boolValue(config, "reselect_targets") !== undefined
        ? { reselectTargets: boolValue(config, "reselect_targets") }
        : {}),
      capabilities: [...new Set(capabilities)].sort(),
    });
  }

  return results.sort((a, b) => a.component.localeCompare(b.component));
}
