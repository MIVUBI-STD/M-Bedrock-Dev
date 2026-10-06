import { describe, expect, it } from "vitest";
import { extractRideableSemantics, parseEntityDefinition } from "../src/index.js";

describe("rideable semantics", () => {
  it("keeps seat, control and dismount semantics state-scoped", () => {
    const entity = parseEntityDefinition({
      "minecraft:entity": {
        description: { identifier: "demo:vehicle" },
        component_groups: {
          mounted: {
            "minecraft:rideable": {
              seat_count: 2,
              dismount_mode: "on_top_center",
              family_types: ["player"],
              seats: [
                { controlling_seat: true },
                { controlling_seat: false },
              ],
            },
          },
        },
      },
    }, { artifactId: "fixture", relativePath: "entities/vehicle.json" });
    expect(extractRideableSemantics(entity)).toEqual([
      expect.objectContaining({
        entityIdentifier: "demo:vehicle",
        stateId: "group:mounted",
        seatCount: 2,
        declaredSeats: 2,
        controllingSeats: [0],
        dismountMode: "on_top_center",
        riderFamilies: ["player"],
      }),
    ]);
  });
});
