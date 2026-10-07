import { describe, expect, it } from "vitest";
import { projectMapAuditFindingReasoning } from "../../src/reporting/map-audit-finding-reasoning.js";

describe("map audit finding reasoning projection", () => {
  it("projects evidence chain and minimal validation without changing proof status", () => {
    const result = projectMapAuditFindingReasoning({
      projection: {
        reportClassification: "LIKELY BUG",
        diagnosticDisposition: "confirmed-defect",
        proofConfidence: "high",
        reasons: [],
      },
      assessment: {
        hypothesisId:"h",disposition:"supported",
        supportingEvidenceIds:["static:a","runtime:b"],
        eliminatingEvidenceIds:[],
        missingRequiredPredicates:["target-ready"],reasons:[],
        domains:["runtime","static"],corroborationCount:2,
        confidence:"high",nextPredicate:"target-ready",
      },
      probe: {
        hypothesisId:"h",predicate:"target-ready",probeId:"chunk-ready",
        disposition:"probe-selected",
      },
    });
    expect(result).toMatchObject({
      reportClassification:"LIKELY BUG",
      diagnosticDisposition:"confirmed-defect",
      proofConfidence:"high",
      evidenceChain:["runtime:b","static:a"],
      unresolvedPredicates:["target-ready"],
      recommendedReadOnlyProbeId:"chunk-ready",
    });
  });
});
