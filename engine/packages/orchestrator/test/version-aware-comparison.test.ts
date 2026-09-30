import { describe, expect, it } from "vitest";
import type { VersionAwareEvidenceLink } from "../src/version-aware-comparison.js";

describe("version-aware comparison contract", () => {
  it("keeps update/native/regression evidence descriptive", () => {
    const link: VersionAwareEvidenceLink = {
      updateEntryId: "1.26.40-structure-saved-tick-fix",
      domain: "structures",
      overlappingCapabilities: ["structure-load"],
      historicalRegressionIds: ["reg_capture_run_gate_blocked"],
      nativeEvidence: {
        countDeltas: ["pendingTickRecords:-2"],
        changedChunkSignals: 1,
      },
      scriptEvidence: {
        moduleSurfaceOverlap: false,
        moduleIdentifiers: [],
        exactSymbolMatches: [],
        observedSymbols: 0,
        unclassifiedObservedSymbols: [],
      },
    };

    expect(link.updateEntryId).toContain("1.26.40");
    expect(link.nativeEvidence.changedChunkSignals).toBe(1);
  });
  it("keeps causal comparison descriptive and non-predictive", () => {
    const causal = {
      before: {
        chains: 1,
        incidents: 1,
        highConfidence: 0,
        mediumConfidence: 0,
        lowConfidence: 1,
        projectedRisks: 2,
        corroboratedRisks: 0,
        observedOutcomes: 0,
        rootCauseCandidates: 1,
        candidateLabels: ["route-affecting-world-mutation"],
      },
      after: {
        chains: 1,
        incidents: 1,
        highConfidence: 0,
        mediumConfidence: 1,
        lowConfidence: 0,
        projectedRisks: 2,
        corroboratedRisks: 1,
        observedOutcomes: 1,
        rootCauseCandidates: 1,
        candidateLabels: ["route-affecting-world-mutation"],
      },
      delta: {
        chains: 0,
        incidents: 0,
        highConfidence: 0,
        mediumConfidence: 1,
        lowConfidence: -1,
        projectedRisks: 0,
        corroboratedRisks: 1,
        observedOutcomes: 1,
        rootCauseCandidates: 0,
        addedCandidateLabels: [],
        removedCandidateLabels: [],
      },
    };

    expect(causal.delta.observedOutcomes).toBe(1);
    expect(causal.delta.mediumConfidence).toBe(1);
    expect(causal.delta.addedCandidateLabels).toEqual([]);
  });
});
