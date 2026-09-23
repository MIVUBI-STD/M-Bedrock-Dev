import { describe, expect, it } from "vitest";
import {
  exploreInterleavings,
  type ScheduledOperation,
} from "../src/index.js";

describe("interleaving reduction scalability", () => {
  it("does not enumerate factorial schedules when all operations are independent", () => {
    const operations: ScheduledOperation<number>[] = Array.from(
      { length: 8 },
      (_, index) => ({
        id: `op-${index}`,
        value: index,
        footprint: {
          reads: [],
          writes: [`resource-${index}`],
        },
      }),
    );

    const result = exploreInterleavings(operations, {
      maxSchedules: 100,
      maxExploredNodes: 1000,
    });

    expect(result.schedules).toHaveLength(1);
    expect(result.exploredNodes).toBeLessThan(20);
    expect(result.reducedEquivalentBranches).toBeGreaterThan(0);
    expect(result.truncated).toBe(false);
  });

  it("rejects duplicate operation ids because replay identity would be ambiguous", () => {
    expect(() => exploreInterleavings([
      { id: "same", value: 1, footprint: { reads: [], writes: ["a"] } },
      { id: "same", value: 2, footprint: { reads: [], writes: ["b"] } },
    ], { maxSchedules: 10 })).toThrow(/unique/);
  });
});
