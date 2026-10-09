import { describe, expect, it } from "vitest";
import type {
  CausalIncident,
  CausalProofState,
  RuntimeEvidenceIntegrityReport,
} from "../../../project-model/src/index.js";
import {
  capCausalProofState,
  capRootCauseEvidenceLevel,
  decideDiagnosticRepair,
  diagnosticEvidenceCeiling,
} from "../../src/diagnosis/diagnostic-repair-gate.js";
import type { DiagnosticInvestigationState } from "../../src/diagnosis/diagnostic-investigation.js";

function incident(
  level: CausalIncident["rootCauseCandidates"][number]["evidenceLevel"],
  proofState?: CausalProofState,
): CausalIncident {
  return {
    id: "incident-1",
    scopeKey: "arena:1",
    severity: "critical",
    confidence: "high",
    chainIds: [],
    relatedDiagnosticIds: [],
    nodes: [],
    links: [],
    rootCauseCandidates: [{
      id: "chunk",
      label: "chunk-not-ready",
      evidenceLevel: level,
      ...(proofState === undefined
        ? {}
        : { proof: { state: proofState } }),
      severity: "critical",
      confidence: "high",
      chainIds: [],
      relatedDiagnosticIds: [],
      support: {
        dependencyViolations: 1,
        evidenceGaps: 0,
        corroboratedRisks: 1,
        observedOutcomes: level === "proven-with-observed-outcome" ? 1 : 0,
      },
    }],
  };
}

function investigation(supported: boolean): DiagnosticInvestigationState {
  return {
    incidentId: "incident-1",
    activeCandidateIds: ["chunk"],
    rejectedCandidateIds: [],
    supportedCandidateIds: supported ? ["chunk"] : [],
    observations: [],
  };
}

const cleanRuntimeIntegrity: RuntimeEvidenceIntegrityReport = {
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
  reasons: ["evidence complete"],
};

describe("diagnostic repair gate v2", () => {
  it("caps proof claims in remote/static contexts", () => {
    expect(capRootCauseEvidenceLevel(
      "proven-with-observed-outcome",
      "REMOTE_GITHUB",
    )).toBe("proven-dependency-violation");

    expect(capCausalProofState(
      "causal",
      "REMOTE_GITHUB",
    )).toBe("localized");

    expect(diagnosticEvidenceCeiling("REMOTE_GITHUB"))
      .toMatchObject({
        maximumClaimStrength: "proven-static",
        maximumEvidenceLevel: "proven-dependency-violation",
        maximumProofState: "localized",
      });
  });

  it("treats legacy runtime-observed outcome as correlation, not causation", () => {
    expect(decideDiagnosticRepair(
      incident("proven-with-observed-outcome"),
      investigation(true),
      "LIVE_MINECRAFT",
      cleanRuntimeIntegrity,
    )).toMatchObject({
      disposition: "proposal-only",
      proofState: "correlated",
      claimStrength: "corroborated",
    });
  });

  it("does not authorize mutation merely because one candidate remains", () => {
    expect(decideDiagnosticRepair(
      incident("corroborated-candidate"),
      investigation(true),
      "LIVE_MINECRAFT",
    ).disposition).toBe("proposal-only");
  });

  it("requires explicit investigation support", () => {
    expect(decideDiagnosticRepair(
      incident("proven-with-observed-outcome", "causal"),
      investigation(false),
      "LIVE_MINECRAFT",
      cleanRuntimeIntegrity,
    ).disposition).toBe("proposal-only");
  });

  it("blocks experiment-backed mutation when intervention provenance is missing", () => {
    const base = incident(
      "proven-with-observed-outcome",
      "intervention-supported",
    );
    const experimental: CausalIncident = {
      ...base,
      rootCauseCandidates: [{
        ...base.rootCauseCandidates[0]!,
        causalPredicateIds: ["chunk-not-ready"],
        proof: {
          state: "intervention-supported",
          interventionIds: ["exp:chunk"],
        },
      }],
    };

    const decision = decideDiagnosticRepair(
      experimental,
      investigation(true),
      "LIVE_MINECRAFT",
      cleanRuntimeIntegrity,
    );

    expect(decision).toMatchObject({
      disposition: "proposal-only",
      proofState: "localized",
    });
    expect(decision.reasons.join(" ")).toMatch(
      /missing provenance/i,
    );
  });

  it("blocks experiment-backed mutation when provenance belongs to another predicate", () => {
    const base = incident(
      "proven-with-observed-outcome",
      "intervention-supported",
    );
    const experimental: CausalIncident = {
      ...base,
      rootCauseCandidates: [{
        ...base.rootCauseCandidates[0]!,
        causalPredicateIds: ["chunk-not-ready"],
        proof: {
          state: "intervention-supported",
          interventionIds: ["exp:chunk"],
          interventionProvenance: [{
            interventionId: "exp:chunk",
            experimentRevision: "rev-1",
            predicateId: "different-predicate",
            controlledFactorIds: ["chunk-loaded"],
            controlledFactorContrasts: [{
              factorId: "chunk-loaded",
              controlValue: false,
              treatmentValue: true,
            }],
            controlState: "absent",
            treatmentState: "present",
            expectedContrastDisposition: "matched",
            targetProfileFingerprint: "profile-a",
            fixtureFingerprint: "fixture-a",
            evidenceIds: ["e:1"],
          }],
        },
      }],
    };

    const decision = decideDiagnosticRepair(
      experimental,
      investigation(true),
      "LIVE_MINECRAFT",
      cleanRuntimeIntegrity,
    );

    expect(decision).toMatchObject({
      disposition: "proposal-only",
      proofState: "localized",
    });
    expect(decision.reasons.join(" ")).toMatch(
      /not covered by matched intervention provenance/i,
    );
  });

  it("blocks experiment-backed mutation when provenance belongs to another controlled factor", () => {
    const base = incident(
      "proven-with-observed-outcome",
      "intervention-supported",
    );
    const experimental: CausalIncident = {
      ...base,
      rootCauseCandidates: [{
        ...base.rootCauseCandidates[0]!,
        causalPredicateIds: ["chunk-not-ready"],
        causalFactorIds: ["chunk-loaded"],
        proof: {
          state: "intervention-supported",
          interventionIds: ["exp:chunk"],
          interventionProvenance: [{
            interventionId: "exp:chunk",
            experimentRevision: "rev-1",
            predicateId: "chunk-not-ready",
            controlledFactorIds: ["different-factor"],
            controlledFactorContrasts: [{
              factorId: "different-factor",
              controlValue: false,
              treatmentValue: true,
            }],
            controlState: "absent",
            treatmentState: "present",
            expectedContrastDisposition: "matched",
            targetProfileFingerprint: "profile-a",
            fixtureFingerprint: "fixture-a",
            evidenceIds: ["e:1"],
          }],
        },
      }],
    };

    const decision = decideDiagnosticRepair(
      experimental,
      investigation(true),
      "LIVE_MINECRAFT",
      cleanRuntimeIntegrity,
    );

    expect(decision).toMatchObject({
      disposition: "proposal-only",
      proofState: "localized",
    });
    expect(decision.reasons.join(" ")).toMatch(
      /causal factors/i,
    );
  });

  it("allows guarded mutation when experiment provenance is complete and bound to the candidate predicate", () => {
    const base = incident(
      "proven-with-observed-outcome",
      "intervention-supported",
    );
    const experimental: CausalIncident = {
      ...base,
      rootCauseCandidates: [{
        ...base.rootCauseCandidates[0]!,
        causalPredicateIds: ["chunk-not-ready"],
        causalFactorIds: ["chunk-loaded"],
        proof: {
          state: "intervention-supported",
          interventionIds: ["exp:chunk"],
          interventionProvenance: [{
            interventionId: "exp:chunk",
            experimentRevision: "rev-1",
            predicateId: "chunk-not-ready",
            controlledFactorIds: ["chunk-loaded"],
            controlledFactorContrasts: [{
              factorId: "chunk-loaded",
              controlValue: false,
              treatmentValue: true,
            }],
            controlState: "absent",
            treatmentState: "present",
            expectedContrastDisposition: "matched",
            targetProfileFingerprint: "profile-a",
            fixtureFingerprint: "fixture-a",
            evidenceIds: ["e:1"],
          }],
        },
      }],
    };

    const decision = decideDiagnosticRepair(
      experimental,
      investigation(true),
      "LIVE_MINECRAFT",
      cleanRuntimeIntegrity,
    );

    expect(decision).toMatchObject({
      disposition: "guarded-repair-eligible",
      proofState: "intervention-supported",
    });
    expect(
      decision.causalProof?.interventionProvenance?.[0]?.predicateId,
    ).toBe("chunk-not-ready");
  });

  it("allows only guarded working-copy mutation for intervention-supported proof", () => {
    expect(decideDiagnosticRepair(
      incident("proven-with-observed-outcome", "intervention-supported"),
      investigation(true),
      "LIVE_MINECRAFT",
      cleanRuntimeIntegrity,
    )).toMatchObject({
      disposition: "guarded-repair-eligible",
      proofState: "intervention-supported",
    });
  });

  it("allows a repair candidate only after explicit causal proof", () => {
    expect(decideDiagnosticRepair(
      incident("proven-with-observed-outcome", "causal"),
      investigation(true),
      "LIVE_MINECRAFT",
      cleanRuntimeIntegrity,
    )).toMatchObject({
      disposition: "repair-eligible",
      selectedCandidateId: "chunk",
      proofState: "causal",
      claimStrength: "proven-runtime",
    });
  });

  it("requires an integrity report for mutation-level runtime proof", () => {
    const decision = decideDiagnosticRepair(
      incident("proven-with-observed-outcome", "causal"),
      investigation(true),
      "LIVE_MINECRAFT",
    );

    expect(decision.disposition).toBe("proposal-only");
    expect(decision.reasons.join(" ")).toMatch(/integrity report/i);
  });

  it("keeps repair closed while multiple candidates remain", () => {
    const base = incident("proven-with-observed-outcome", "causal");
    const multi: CausalIncident = {
      ...base,
      rootCauseCandidates: [
        ...base.rootCauseCandidates,
        {
          ...base.rootCauseCandidates[0]!,
          id: "route",
          label: "route-invalid",
        },
      ],
    };
    const state: DiagnosticInvestigationState = {
      ...investigation(true),
      activeCandidateIds: ["chunk", "route"],
      supportedCandidateIds: ["chunk"],
    };

    expect(decideDiagnosticRepair(
      multi,
      state,
      "LIVE_MINECRAFT",
      cleanRuntimeIntegrity,
    ).disposition).toBe("observe-only");
  });

  it("blocks mutation-level proof when current-state evidence is unsafe", () => {
    const decision = decideDiagnosticRepair(
      incident("proven-with-observed-outcome", "causal"),
      investigation(true),
      "LIVE_MINECRAFT",
      {
        ...cleanRuntimeIntegrity,
        unresolvedConflictPredicates: ["chunk-ready"],
        safeForCurrentStateClaims: false,
        safeForTemporalViolationClaims: false,
        reasons: ["Unresolved conflicting runtime evidence."],
      },
    );

    expect(decision.disposition).toBe("proposal-only");
    expect(decision.reasons.join(" ")).toMatch(/integrity/i);
  });

  it("downgrades mutation-level proof when temporal integrity is unsafe", () => {
    const decision = decideDiagnosticRepair(
      incident("proven-with-observed-outcome", "causal"),
      investigation(true),
      "LIVE_MINECRAFT",
      {
        ...cleanRuntimeIntegrity,
        unlocatedObservedRecords: 1,
        safeForTemporalViolationClaims: false,
        reasons: [
          "Observed runtime evidence lacks a safe temporal observation point.",
        ],
      },
    );

    expect(decision).toMatchObject({
      disposition: "proposal-only",
      proofState: "localized",
      claimStrength: "proven-static",
    });
  });
});
