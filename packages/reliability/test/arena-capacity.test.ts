import { describe, expect, it } from "vitest";
import {
  solveArenaConcurrencyCapacity,
} from "../src/arena-capacity.js";

describe("arena capacity solver", () => {
  it("finds the real concurrency bottleneck across shared resources", () => {
    const result = solveArenaConcurrencyCapacity({
      configuredArenaCount: 5,
      requiredConcurrentArenas: 5,
      resources: [
        {
          resource: "ticking-area",
          totalCapacity: 10,
          reservedCapacity: 2,
          perArenaCost: 3,
        },
        {
          resource: "structure-slots",
          totalCapacity: 20,
          perArenaCost: 2,
        },
      ],
    });

    expect(result.status).toBe("insufficient");
    expect(result.supportedConcurrentArenas).toBe(2);
    expect(result.bottlenecks).toEqual(["ticking-area"]);
  });

  it("returns unknown instead of guessing missing runtime limits", () => {
    const result = solveArenaConcurrencyCapacity({
      configuredArenaCount: 4,
      resources: [
        {
          resource: "ticking-area",
          perArenaCost: 1,
        },
      ],
    });

    expect(result.status).toBe("unknown");
  });
});
