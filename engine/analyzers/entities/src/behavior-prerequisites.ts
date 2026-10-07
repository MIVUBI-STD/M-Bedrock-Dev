import { extractAttackSemantics } from "./attack.js";
import { extractNavigationCapabilities } from "./navigation.js";
import type { EntityStateCandidate } from "./types.js";

export interface EntityBehaviorPrerequisiteAssessment {
  behavior: string;
  status: "satisfied" | "missing-prerequisite";
  missing: string[];
}

function hasTargetAcquisition(state: EntityStateCandidate): boolean {
  return state.activeComponents.some((component) =>
    component === "minecraft:behavior.nearest_attackable_target" ||
    component === "minecraft:behavior.hurt_by_target" ||
    component === "minecraft:behavior.owner_hurt_by_target" ||
    component === "minecraft:behavior.owner_hurt_target" ||
    component === "minecraft:behavior.defend_village_target"
  );
}

export function assessEntityBehaviorPrerequisites(
  state: EntityStateCandidate,
): readonly EntityBehaviorPrerequisiteAssessment[] {
  const output: EntityBehaviorPrerequisiteAssessment[] = [];
  const attacks = extractAttackSemantics(state);

  for (const attack of attacks) {
    const missing: string[] = [];
    if (
      attack.kind === "ranged" &&
      !attack.capabilities.includes("attack:shooter")
    ) {
      missing.push("minecraft:shooter");
    }
    if (
      attack.kind === "melee" &&
      !attack.capabilities.includes("attack:damage-component")
    ) {
      missing.push("minecraft:attack");
    }
    output.push({
      behavior: attack.component,
      status: missing.length === 0 ? "satisfied" : "missing-prerequisite",
      missing,
    });
  }

  if (state.activeComponents.includes("minecraft:behavior.open_door")) {
    const navigation = extractNavigationCapabilities(state);
    const missing = navigation.capabilities.includes("navigation:path-through-doors")
      ? []
      : ["navigation:path-through-doors"];
    output.push({
      behavior: "minecraft:behavior.open_door",
      status: missing.length === 0 ? "satisfied" : "missing-prerequisite",
      missing,
    });
  }

  if (
    state.activeComponents.includes(
      "minecraft:behavior.stalk_and_pounce_on_target",
    )
  ) {
    const missing: string[] = [];
    if (!state.activeComponents.includes("minecraft:attack")) {
      missing.push("minecraft:attack");
    }
    if (!hasTargetAcquisition(state)) {
      missing.push("target-acquisition");
    }
    output.push({
      behavior: "minecraft:behavior.stalk_and_pounce_on_target",
      status: missing.length === 0 ? "satisfied" : "missing-prerequisite",
      missing,
    });
  }

  return output.sort((a, b) => a.behavior.localeCompare(b.behavior));
}
