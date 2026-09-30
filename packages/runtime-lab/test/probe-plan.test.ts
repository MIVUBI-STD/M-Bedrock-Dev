import { describe, expect, it } from "vitest";
import {
  selectRuntimeProbePlan,
} from "../src/probe-plan.js";

describe("runtime probe plan", () => {
  it("maps ranked diagnostic probes to the cheapest executable instructions", () => {
    const plan = selectRuntimeProbePlan(
      [
        {
          probeId: "arena-release-after-disconnect",
          pairwiseSeparations: 2,
          coveredHypotheses: 3,
          cost: 1,
          risk: 0,
          utility: 2.3,
        },
      ],
      [
        {
          probeId: "arena-release-after-disconnect",
          title: "Arena release after disconnect",
          goal: "Prove whether the arena lease is released.",
          setup: ["Start one arena with two players."],
          steps: ["Disconnect player A.", "Finish or abort with player B.", "Attempt to reuse the arena."],
          expectedEvidence: ["arena lease state", "join result"],
          mutationRisk: "guarded",
        },
      ],
    );

    expect(plan.selected?.probeId).toBe(
      "arena-release-after-disconnect",
    );
  });
});
