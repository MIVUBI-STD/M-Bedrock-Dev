import { describe, expect, it } from "vitest";
import type {
  CausalIncident,
  CausalProofState,
  RuntimeEvidenceIntegrityReport,
} from "../../project-model/src/index.js";
import {
  capCausalProofState,
  capRootCauseEvidenceLevel,
  decideDiagnosticRepair,
  diagnosticEvidenceCeiling,
} from "../src/diagnostic-repair-gate.js";
import type { DiagnosticInvestigationState } from "../src/diagnostic-investigation.js";

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
