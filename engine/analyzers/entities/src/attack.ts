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

export interface AttackSemantics {
  component: string;
  kind: "melee" | "ranged" | "other";
  trackTarget?: boolean;
  attackRadius?: number;
  attackInterval?: number;
  capabilities: string[];
}

export function extractAttackSemantics(
  state: EntityStateCandidate,
): AttackSemantics[] {
  const output: AttackSemantics[] = [];

  for (const component of state.activeComponents) {
    if (!component.startsWith("minecraft:behavior.")) continue;

    let kind: AttackSemantics["kind"] | undefined;
    if (
      component === "minecraft:behavior.melee_attack" ||
      component === "minecraft:behavior.melee_box_attack" ||
      component === "minecraft:behavior.delayed_attack"
    ) {
      kind = "melee";
    } else if (
      component === "minecraft:behavior.ranged_attack" ||
      component === "minecraft:behavior.fire_at_target"
    ) {
      kind = "ranged";
    }

    if (!kind) continue;

    const config = asRecord(state.activeComponentData[component]) ?? {};
    const trackTarget = boolValue(config, "track_target");
    const attackRadius = numberValue(config, "attack_radius");
    const attackInterval = numberValue(config, "attack_interval");
    const capabilities = [
      `attack:behavior:${kind}`,
    ];

    if (state.activeComponents.includes("minecraft:attack")) {
      capabilities.push("attack:damage-component");
    }
    if (state.activeComponents.includes("minecraft:shooter")) {
      capabilities.push("attack:shooter");
    }

    output.push({
      component,
      kind,
      ...(trackTarget !== undefined ? { trackTarget } : {}),
      ...(attackRadius !== undefined ? { attackRadius } : {}),
      ...(attackInterval !== undefined ? { attackInterval } : {}),
      capabilities: [...new Set(capabilities)].sort(),
    });
  }

  return output.sort((a, b) => a.component.localeCompare(b.component));
}
