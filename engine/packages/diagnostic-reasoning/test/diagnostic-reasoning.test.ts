import { describe, expect, it } from "vitest";
import {
  assessDiagnosticHypotheses,
  rankDiagnosticProbes,
  validateDiagnosticHypothesisSet,
  validateDiagnosticProbeCandidates,
  type DiagnosticHypothesisSet,
  type DiagnosticProbeCandidate,
} from "../src/index.js";

const hypotheses: DiagnosticHypothesisSet = {
  schemaVersion: 1,
  id: "entity-stall",
  hypotheses: [
    {
      id: "chunk-unloaded",
      statement:
        "The entity cannot progress because its route chunk is not loaded for script.",
      requiredPredicates: [
        "route-chunk-unloaded",
      ],
      falsifierPredicates: [
        "route-chunk-loaded",
      ],
    },
    {
      id: "navigation-lost",
      statement:
        "The entity has lost its active navigation target.",
      requiredPredicates: [
        "navigation-target-missing",
      ],
      falsifierPredicates: [
        "navigation-target-present",
      ],
    },
    {
      id: "collision-congestion",
      statement:
        "Nearby entity collision is preventing forward progress.",
      supportingPredicates: [
        "local-entity-density-high",
      ],
      falsifierPredicates: [
        "local-entity-density-low",
      ],
    },
  ],
};

const probes: DiagnosticProbeCandidate[] = [
  {
    id: "probe-chunk",
    predicate: "route-chunk-loaded",
    cost: 0.1,
    risk: 0,
    predictions: [
      {
        hypothesisId: "chunk-unloaded",
        state: "absent",
      },
      {
        hypothesisId: "navigation-lost",
        state: "present",
      },
      {
        hypothesisId: "collision-congestion",
        state: "present",
      },
    ],
  },
  {
    id: "probe-scoreboard",
    predicate: "unrelated-score",
    cost: 0.1,
    risk: 0,
    predictions: [
      {
        hypothesisId: "chunk-unloaded",
        state: "present",
      },
      {
        hypothesisId: "navigation-lost",
        state: "present",
      },
      {
        hypothesisId: "collision-congestion",
        state: "present",
      },
    ],
  },
];

describe("diagnostic reasoning", () => {
  it("keeps incomplete alternatives open and eliminates only explicit contradictions", () => {
    const assessments =
      assessDiagnosticHypotheses(
        hypotheses,
        [{
          predicate:
            "route-chunk-loaded",
          state: "present",
          evidenceId: "e:chunk",
        }],
      );

    expect(
      assessments.find(
        (item) =>
          item.hypothesisId ===
          "chunk-unloaded",
      )?.disposition,
    ).toBe("eliminated");

    expect(
      assessments.find(
        (item) =>
          item.hypothesisId ===
          "navigation-lost",
      )?.disposition,
    ).toBe("open");
  });

  it("ranks a discriminating probe above a non-discriminating probe", () => {
    const assessments =
      assessDiagnosticHypotheses(
        hypotheses,
        [],
      );
    const ranked =
      rankDiagnosticProbes(
        probes,
        assessments,
      );

    expect(ranked[0]?.probeId)
      .toBe("probe-chunk");
    expect(
      ranked[0]?.pairwiseSeparations,
    ).toBeGreaterThan(0);
    expect(
      ranked[1]?.pairwiseSeparations,
    ).toBe(0);
  });

  it("validates hypothesis and probe references", () => {
    expect(
      validateDiagnosticHypothesisSet(
        hypotheses,
      ),
    ).toEqual([]);
    expect(
      validateDiagnosticProbeCandidates(
        hypotheses,
        probes,
      ),
    ).toEqual([]);
  });
});
