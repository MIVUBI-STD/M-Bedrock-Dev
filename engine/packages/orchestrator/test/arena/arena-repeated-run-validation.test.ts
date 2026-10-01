import { describe, expect, it } from "vitest";
import { deriveArenaRepeatedRunValidationPlan } from "../../src/arena/arena-repeated-run-validation.js";

describe("arena repeated-run validation", () => {
  it("creates 1/2/5/20 single and all-arena stages", () => {
    const plan =
      deriveArenaRepeatedRunValidationPlan();

    expect(plan.runCounts).toEqual([
      1,
      2,
      5,
      20,
    ]);
    expect(plan.stages).toHaveLength(8);
    expect(
      plan.stages.find(
        (item) =>
          item.runs === 20 &&
          item.scope === "all-arenas",
      )?.compareSurfaces,
    ).toEqual(
      expect.arrayContaining([
        "deferred-callbacks",
        "dynamic-properties",
        "pending-random-ticks",
        "world-global-leases",
      ]),
    );
  });

  it("rejects invalid run counts", () => {
    expect(() =>
      deriveArenaRepeatedRunValidationPlan([
        1,
        0,
      ]),
    ).toThrow(/positive integer/);
  });
});
