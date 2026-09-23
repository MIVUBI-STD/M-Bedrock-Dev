import type {
  EntityStateCandidate,
  NavigationCapabilities,
} from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function bool(
  record: Record<string, unknown>,
  key: string,
): boolean | undefined {
  return typeof record[key] === "boolean" ? record[key] as boolean : undefined;
}

const NAVIGATION_PREFIX = "minecraft:navigation.";

export function extractNavigationCapabilities(
  state: EntityStateCandidate,
): NavigationCapabilities {
  const navigationComponent = state.activeComponents.find((component) =>
    component.startsWith(NAVIGATION_PREFIX)
  );
  if (!navigationComponent) return { capabilities: [] };

  const config = asRecord(state.activeComponentData[navigationComponent]) ?? {};
  const canPassDoors = bool(config, "can_pass_doors");
  const canOpenDoors = bool(config, "can_open_doors");
  const canOpenIronDoors = bool(config, "can_open_iron_doors");
  const canBreakDoors = bool(config, "can_break_doors");
  const canPathOverWater = bool(config, "can_path_over_water");
  const canSwim = bool(config, "can_swim");
  const canWalk = bool(config, "can_walk");
  const canSink = bool(config, "can_sink");
  const avoidWater = bool(config, "avoid_water");
  const avoidDamageBlocks = bool(config, "avoid_damage_blocks");

  const capabilities: string[] = [];
  if (canPassDoors !== false) capabilities.push("navigation:path-through-doors");
  if (canOpenDoors === true) capabilities.push("navigation:can-open-doors");
  if (canOpenIronDoors === true) capabilities.push("navigation:can-open-iron-doors");
  if (canBreakDoors === true) capabilities.push("navigation:can_break_doors");
  if (canPathOverWater === true) capabilities.push("navigation:path-over-water");
  if (canSwim === true) capabilities.push("navigation:swim");
  if (canWalk !== false) capabilities.push("navigation:walk");
  if (canSink !== false) capabilities.push("navigation:sink");
  if (avoidWater === true) capabilities.push("navigation:avoid-water");
  if (avoidDamageBlocks === true) capabilities.push("navigation:avoid-damage-blocks");

  return {
    navigationComponent,
    ...(canPassDoors !== undefined ? { canPassDoors } : {}),
    ...(canOpenDoors !== undefined ? { canOpenDoors } : {}),
    ...(canOpenIronDoors !== undefined ? { canOpenIronDoors } : {}),
    ...(canBreakDoors !== undefined ? { canBreakDoors } : {}),
    ...(canPathOverWater !== undefined ? { canPathOverWater } : {}),
    ...(canSwim !== undefined ? { canSwim } : {}),
    ...(canWalk !== undefined ? { canWalk } : {}),
    ...(canSink !== undefined ? { canSink } : {}),
    ...(avoidWater !== undefined ? { avoidWater } : {}),
    ...(avoidDamageBlocks !== undefined ? { avoidDamageBlocks } : {}),
    capabilities: capabilities.sort(),
  };
}
