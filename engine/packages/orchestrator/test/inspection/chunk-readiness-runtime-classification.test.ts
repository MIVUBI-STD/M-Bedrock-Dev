import { describe, expect, it } from "vitest";
import {
  classifyChunkReadinessRuntimeExperiment,
} from "../../src/inspection/chunk-readiness-runtime-classification.js";

describe("chunk readiness runtime classification", () => {
  it("classifies player-loader intervention when readiness contrast is supported", () => {
    const result =
      classifyChunkReadinessRuntimeExperiment(
        "player-loader",
        {
          experimentId: "loader",
          qualificationState:
            "intervention-supported",
          observations: [],
          predicates: [{
            predicate: "target-chunk-ready",
            observation: {
              predicate: "target-chunk-ready",
              state: "unknown",
              evidenceId: "aggregate",
            },
            ceiling:
              "intervention-supported",
            sourceEvidenceIds: [
              "e:control",
              "e:treatment",
            ],
            interventionContrast: true,
            expectedContrastDisposition:
              "matched",
            observedContrast: {
              controlState: "absent",
              treatmentState: "present",
            },
          }],
        },
      );

    expect(result.disposition)
      .toBe("player-loader-effective");
  });

  it("classifies ticking-area intervention separately", () => {
    const result =
      classifyChunkReadinessRuntimeExperiment(
        "ticking-area",
        {
          experimentId: "lease",
          qualificationState:
            "intervention-supported",
          observations: [],
          predicates: [{
            predicate: "target-chunk-ready",
            observation: {
              predicate: "target-chunk-ready",
              state: "unknown",
              evidenceId: "aggregate",
            },
            ceiling:
              "intervention-supported",
            sourceEvidenceIds: [
              "e:control",
              "e:treatment",
            ],
            interventionContrast: true,
            expectedContrastDisposition:
              "matched",
            observedContrast: {
              controlState: "absent",
              treatmentState: "present",
            },
          }],
        },
      );

    expect(result.disposition)
      .toBe("ticking-area-effective");
  });

  it("fails closed on expected contrast mismatch", () => {
    const result =
      classifyChunkReadinessRuntimeExperiment(
        "ticking-area",
        {
          experimentId: "lease",
          qualificationState: "repeatable",
          observations: [],
          predicates: [{
            predicate: "target-chunk-ready",
            observation: {
              predicate: "target-chunk-ready",
              state: "present",
              evidenceId: "aggregate",
            },
            ceiling: "repeatable",
            sourceEvidenceIds: ["e:one"],
            interventionContrast: false,
            expectedContrastDisposition:
              "mismatched",
          }],
        },
      );

    expect(result.disposition)
      .toBe("contrast-mismatch");
  });
});
