import { describe, expect, it } from "vitest";
import { parseEntityDefinition } from "../../../../analyzers/entities/src/index.js";
import { analyzeMountSurfaces } from "../../src/inspection/mount-analysis.js";

describe("mount analysis", () => {
  it("surfaces contradictory seat declarations without inventing runtime rider state", () => {
    const entity = parseEntityDefinition({
      "minecraft:entity": {
        description: { identifier: "demo:vehicle" },
        components: {
          "minecraft:rideable": {
            seat_count: 1,
            seats: [
              { controlling_seat: true },
              { controlling_seat: true },
            ],
          },
        },
      },
    }, { artifactId: "fixture", relativePath: "entities/vehicle.json" });
    expect(analyzeMountSurfaces([entity])).toMatchObject({
      rideableEntities: 1,
      seatCountMismatches: 1,
      multipleControllingSeatStates: 1,
      runtimeRelationshipStatus: "unresolved",
    });
  });
});
