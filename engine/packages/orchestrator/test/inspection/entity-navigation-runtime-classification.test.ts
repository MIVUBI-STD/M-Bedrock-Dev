import { describe, expect, it } from "vitest";
import {
  classifyEntityNavigationRuntimeExperiment,
} from "../../src/inspection/entity-navigation-runtime-classification.js";

describe("entity navigation runtime classification", () => {
  it("classifies intervention-supported crowding contrast as dynamic congestion", () => {
    const result =
      classifyEntityNavigationRuntimeExperiment({
        experimentId: "crowding",
        qualificationState:
          "intervention-supported",
        observations: [],
        predicates: [{
          predicate:
            "navigation-stall-observed",
          observation: {
            predicate:
              "navigation-stall-observed",
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
      });

    expect(result).toMatchObject({
      kind: "crowding",
      disposition:
        "dynamic-congestion-supported",
    });
  });

  it("classifies intervention-supported recovery contrast as effective", () => {
    const result =
      classifyEntityNavigationRuntimeExperiment({
        experimentId: "recovery",
        qualificationState:
          "intervention-supported",
        observations: [],
        predicates: [{
          predicate:
            "movement-resumed-after-recovery",
          observation: {
            predicate:
              "movement-resumed-after-recovery",
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
      });

    expect(result).toMatchObject({
      kind: "recovery",
      disposition: "recovery-effective",
    });
  });

  it("fails closed on expected contrast mismatch", () => {
    const result =
      classifyEntityNavigationRuntimeExperiment({
        experimentId: "recovery",
        qualificationState: "repeatable",
        observations: [],
        predicates: [{
          predicate:
            "movement-resumed-after-recovery",
          observation: {
            predicate:
              "movement-resumed-after-recovery",
            state: "present",
            evidenceId: "aggregate",
          },
          ceiling: "repeatable",
          sourceEvidenceIds: [
            "e:recovery",
          ],
          interventionContrast: false,
          expectedContrastDisposition:
            "mismatched",
        }],
      });

    expect(result.disposition)
      .toBe("contrast-mismatch");
  });
});
