import { describe, expect, it } from "vitest";
import type { CausalComparison } from "../src/causal-comparison.js";
import { causalRetestReasons } from "../src/causal-retest.js";

function comparison(delta: Partial<CausalComparison["delta"]>): CausalComparison {
  const snapshot = {
    chains: 0,
    incidents: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    projectedRisks: 0,
    corroboratedRisks: 0,
    observedOutcomes: 0,
    rootCauseCandidates: 0,
    candidateLabels: [],
  };

  return {
    before: snapshot,
    after: snapshot,
    delta: {
      chains: 0,
      incidents: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      projectedRisks: 0,
      corroboratedRisks: 0,
      observedOutcomes: 0,
      rootCauseCandidates: 0,
      addedCandidateLabels: [],
      removedCandidateLabels: [],
      ...delta,
    },
  };
}

describe("causal retest reasons", () => {
  it("weights stronger causal regressions more heavily", () => {
    const reasons = causalRetestReasons(comparison({
      observedOutcomes: 1,
      highConfidence: 1,
      corroboratedRisks: 2,
      addedCandidateLabels: ["route-mutation"],
    }));

    expect(reasons.map((reason) => reason.weight)).toEqual([5, 4, 3, 2]);
    expect(reasons.every((reason) => reason.kind === "causal-regression")).toBe(true);
  });

  it("does not add retest reasons for causal improvements", () => {
    const reasons = causalRetestReasons(comparison({
      observedOutcomes: -1,
      highConfidence: -1,
      corroboratedRisks: -2,
      removedCandidateLabels: ["old-cause"],
    }));

    expect(reasons).toEqual([]);
  });
});
