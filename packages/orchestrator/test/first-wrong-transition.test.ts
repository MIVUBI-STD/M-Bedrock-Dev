import { describe, expect, it } from "vitest";
import type { RuntimeTemporalAssessment } from "../../project-model/src/runtime-temporal.js";
import { identifyFirstWrongTransition } from "../src/first-wrong-transition.js";

function violation(
  id: string,
  sequence: number,
  streamId = "stream-1",
): RuntimeTemporalAssessment {
  return {
    requirementId: id,
    status: "violated-order",
    beforePredicate: id + ":before",
    afterPredicate: id + ":after",
    after: {
      predicate: id + ":after",
      state: "present",
      confidence: "observed",
      observedAt: { streamId, sequence, tick: sequence },
    },
    reason: id,
  };
}

describe("first wrong transition", () => {
  it("selects the earliest comparable temporal violation", () => {
    const result = identifyFirstWrongTransition([
      violation("later", 20),
      violation("earlier", 10),
    ]);

    expect(result.status).toBe("identified");
    expect(result.candidate?.requirementId).toBe("earlier");
  });

  it("refuses to choose between incomparable streams", () => {
    const left = violation("left", 10, "stream-a");
    left.after = {
      ...left.after!,
      observedAt: { streamId: "stream-a", sequence: 10 },
    };
    const right = violation("right", 11, "stream-b");
    right.after = {
      ...right.after!,
      observedAt: { streamId: "stream-b", sequence: 11 },
    };

    const result = identifyFirstWrongTransition([left, right]);
    expect(result.status).toBe("ambiguous");
    expect(result.competingCandidates).toHaveLength(2);
  });

  it("does not treat unresolved or incomplete evidence as a first wrong transition", () => {
    const assessment: RuntimeTemporalAssessment = {
      requirementId: "incomplete",
      status: "evidence-incomplete",
      beforePredicate: "before",
      afterPredicate: "after",
      reason: "continuity gap",
    };

    expect(identifyFirstWrongTransition([assessment]).status)
      .toBe("not-observed");
  });
});
