import { describe, expect, it } from "vitest";
import { extractAttackSemantics } from "../src/attack.js";
import { extractSensorSemantics } from "../src/sensors.js";

describe("attack and sensor semantics", () => {
  it("extracts ranged attack prerequisites from the active state", () => {
    const attacks = extractAttackSemantics({
      id: "ranged",
      activeComponents: [
        "minecraft:behavior.ranged_attack",
        "minecraft:shooter",
      ],
      activeComponentData: {
        "minecraft:behavior.ranged_attack": {
          attack_radius: 12,
          attack_interval: 2,
        },
        "minecraft:shooter": { def: "demo:projectile" },
      },
      activeGroups: [],
    });

    expect(attacks[0]).toMatchObject({
      kind: "ranged",
      attackRadius: 12,
      attackInterval: 2,
    });
    expect(attacks[0]?.capabilities).toContain("attack:shooter");
  });

  it("extracts sensor-emitted events and filter presence", () => {
    const sensors = extractSensorSemantics({
      id: "sensor",
      activeComponents: ["minecraft:environment_sensor"],
      activeComponentData: {
        "minecraft:environment_sensor": {
          triggers: [{
            event: "demo:become_hostile",
            filters: { test: "has_target", value: true },
          }],
        },
      },
      activeGroups: [],
    });

    expect(sensors[0]).toMatchObject({
      emittedEvents: ["demo:become_hostile"],
      hasFilters: true,
    });
  });
});
