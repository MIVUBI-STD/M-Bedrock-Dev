import { describe, expect, it } from "vitest";
import type {
  DiagnosticRepairDecision,
  RuntimeEvidenceIntegrityReport,
} from "../../../project-model/src/index.js";
import type {
  RuntimeIntentDiagnosticReclassification,
} from "../../src/index.js";
import {
  decideReclassifiedRepairEntry,
} from "../../src/index.js";

function reclassification(
  disposition:
    RuntimeIntentDiagnosticReclassification["disposition"],
): RuntimeIntentDiagnosticReclassification {
  return {
    disposition,
    changed: true,
    gate: {
      disposition,
      subjectIds: ["arena"],
      basisInvariantIds: ["inv"],
      evidenceIds: ["e"],
      nextEvidenceNeed: "none",
      reasons: [],
    },
    matchedPredicates: {
      contradictions: [],
      designMatches: [],
      engineConstraints: [],
      compatibilityDifferences: [],
      runtimeProof: [],
    },
  };
}

function repair(
  disposition:
    DiagnosticRepairDecision["disposition"],
): DiagnosticRepairDecision {
  return {
    incidentId: "incident",
    activeCandidateIds: ["candidate"],
    selectedCandidateId: "candidate",
    disposition,
    claimStrength: "proven-runtime",
    proofState:
      disposition === "repair-eligible"
        ? "causal"
        : "intervention-supported",
    reasons: ["diagnostic proof satisfied"],
  };
}

const integrity: RuntimeEvidenceIntegrityReport = {
  records: 2,
  observedRecords: 2,
  derivedRecords: 0,
  unknownConfidenceRecords: 0,
  unlocatedObservedRecords: 0,
  unresolvedConflictPredicates: [],
  resolvedConflictCount: 0,
  continuityComplete: true,
  telemetryContinuityComplete: true,
  safeForCurrentStateClaims: true,
  safeForTemporalViolationClaims: true,
  reasons: ["integrity satisfied"],
};

describe("reclassified repair entry gate", () => {
  it("admits confirmed defects with causal repair authorization and valid runtime integrity", () => {
    const result = decideReclassifiedRepairEntry(
      reclassification("confirmed-defect"),
      repair("repair-eligible"),
      integrity,
      {
        approvedBug: true,
        preservationContractReady: true,
      },
    );

    expect(result.disposition).toBe("admit");
  });

  it("admits guarded mutations only as guarded repair experiments", () => {
    const result = decideReclassifiedRepairEntry(
      reclassification("confirmed-defect"),
      repair("guarded-repair-eligible"),
      integrity,
      {
        approvedBug: true,
        preservationContractReady: true,
      },
    );

    expect(result.disposition).toBe(
      "guarded-admit",
    );
  });

  it("blocks confirmed defects before chat approval", () => {
    const result = decideReclassifiedRepairEntry(
      reclassification("confirmed-defect"),
      repair("repair-eligible"),
      integrity,
    );

    expect(result.disposition).toBe("blocked");
    expect(result.reasons.join(" ")).toMatch(/Approved Bug/);
  });

  it("blocks designed behavior from mutation", () => {
    const result = decideReclassifiedRepairEntry(
      reclassification("designed-behavior"),
      repair("repair-eligible"),
      integrity,
      {
        approvedBug: true,
        preservationContractReady: true,
      },
    );

    expect(result.disposition).toBe("blocked");
  });

  it("blocks confirmed defects when runtime evidence integrity is incomplete", () => {
    const result = decideReclassifiedRepairEntry(
      reclassification("confirmed-defect"),
      repair("repair-eligible"),
      {
        ...integrity,
        safeForTemporalViolationClaims: false,
        reasons: ["telemetry gap"],
      },
    );

    expect(result.disposition).toBe("blocked");
    expect(result.reasons.join(" ")).toMatch(
      /telemetry gap/,
    );
  });
});
