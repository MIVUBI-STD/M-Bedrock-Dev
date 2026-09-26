import { describe, expect, it } from "vitest";
import {
  exploreInterleavings,
  operationsIndependent,
  type ScheduledOperation,
} from "../src/index.js";

function operation(
  id: string,
  write: string,
  surface?: string,
): ScheduledOperation<string> {
  return {
    id,
    value: id,
    footprint: {
      reads: [],
      writes: [write],
      ...(surface === undefined
        ? {}
        : {
            semanticSurfaces: [surface],
          }),
    },
  };
}

describe("happens-before concurrency semantics", () => {
  it("does not collapse disjoint operations sharing an implicit engine surface", () => {
    const a = operation(
      "a",
      "player:p1",
      "event-ordering",
    );
    const b = operation(
      "b",
      "entity:e1",
      "event-ordering",
    );

    expect(
      operationsIndependent(
        a,
        b,
        {
          hiddenDependencySurfaces: [
            "event-ordering",
          ],
        },
      ),
    ).toBe(false);

    const result = exploreInterleavings(
      [a, b],
      {
        maxSchedules: 10,
        concurrency: {
          hiddenDependencySurfaces: [
            "event-ordering",
          ],
        },
      },
    );

    expect(result.schedules)
      .toHaveLength(2);
  });

  it("enforces explicit happens-before ordering", () => {
    const a = operation(
      "a",
      "a-state",
    );
    const b = operation(
      "b",
      "b-state",
    );

    const result = exploreInterleavings(
      [a, b],
      {
        maxSchedules: 10,
        concurrency: {
          happensBefore: [{
            before: "a",
            after: "b",
            reason: "causal-parent",
            evidenceIds: ["e:a-before-b"],
          }],
        },
      },
    );

    expect(
      result.schedules.map((schedule) =>
        schedule.map((item) => item.id)
      ),
    ).toEqual([["a", "b"]]);
    expect(
      result.blockedByHappensBefore,
    ).toBeGreaterThan(0);
  });

  it("rejects cyclic causal ordering instead of returning an empty search space", () => {
    expect(() =>
      exploreInterleavings(
        [
          operation("a", "a-state"),
          operation("b", "b-state"),
        ],
        {
          maxSchedules: 10,
          concurrency: {
            happensBefore: [
              {
                before: "a",
                after: "b",
                reason: "causal-parent",
              },
              {
                before: "b",
                after: "a",
                reason: "causal-parent",
              },
            ],
          },
        },
      )
    ).toThrow(/contains a cycle/);
  });
});
