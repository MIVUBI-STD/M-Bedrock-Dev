import { describe, expect, it } from "vitest";
import {
  exploreInterleavings,
  operationsHaveGenerationConflict,
  type ScheduledOperation,
} from "../src/index.js";

function operation(
  id: string,
  generation: number,
  parents?: readonly string[],
): ScheduledOperation<string> {
  return {
    id,
    value: id,
    footprint: {
      reads: [],
      writes: [id + ":state"],
    },
    causal: {
      generationTokens: {
        "scope:p1": generation,
      },
      ...(parents === undefined
        ? {}
        : { parentOperationIds: parents }),
    },
  };
}

describe("generation-aware interleaving reduction", () => {
  it("keeps different generations as separate schedule choices", () => {
    const first = operation("op-a", 1);
    const second = operation("op-b", 2);

    expect(
      operationsHaveGenerationConflict(
        first,
        second,
      ),
    ).toBe(true);

    const result = exploreInterleavings(
      [first, second],
      { maxSchedules: 10 },
    );

    expect(result.generationDependencyPairs).toBe(1);
    expect(result.schedules).toHaveLength(2);
  });

  it("can reduce independent operations in the same generation", () => {
    const first = operation("op-a", 2);
    const second = operation("op-b", 2);

    const result = exploreInterleavings(
      [first, second],
      { maxSchedules: 10 },
    );

    expect(result.generationDependencyPairs).toBe(0);
    expect(result.schedules).toHaveLength(1);
  });

  it("converts causal parents into mandatory ordering", () => {
    const first = operation("op-a", 1);
    const second = operation(
      "op-b",
      2,
      ["op-a"],
    );

    const result = exploreInterleavings(
      [second, first],
      { maxSchedules: 10 },
    );

    expect(
      result.schedules.map((schedule) =>
        schedule.map((item) => item.id)
      ),
    ).toEqual([["op-a", "op-b"]]);
    expect(result.blockedByHappensBefore)
      .toBeGreaterThan(0);
  });

  it("rejects unknown causal parent references", () => {
    expect(() =>
      exploreInterleavings(
        [
          operation(
            "op-b",
            2,
            ["op-missing"],
          ),
        ],
        { maxSchedules: 10 },
      )
    ).toThrow(/unknown before operation/);
  });
});
