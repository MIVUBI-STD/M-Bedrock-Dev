import { describe, expect, it } from "vitest";
import type { CausalIncident } from "../../project-model/src/causal-chain.js";
import {
  capRootCauseEvidenceLevel,
  decideDiagnosticRepair,
  diagnosticEvidenceCeiling,
} from "../src/diagnostic-repair-gate.js";
import type { DiagnosticInvestigationState } from "../src/diagnostic-investigation.js";

function incident(level: CausalIncident["rootCauseCandidates"][number]["evidenceLevel"]): CausalIncident {
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

describe("diagnostic repair gate", () => {
  it("caps runtime proof claims in remote/static contexts", () => {
    expect(capRootCauseEvidenceLevel(
      "proven-with-observed-outcome",
      "REMOTE_GITHUB",
    )).toBe("proven-dependency-violation");

    expect(diagnosticEvidenceCeiling("REMOTE_GITHUB"))
      .toMatchObject({
        maximumClaimStrength: "proven-static",
        maximumEvidenceLevel: "proven-dependency-violation",
      });
  });

  it("does not authorize repair merely because one candidate remains", () => {
    expect(decideDiagnosticRepair(
      incident("corroborated-candidate"),
      investigation(true),
      "LIVE_MINECRAFT",
    ).disposition).toBe("proposal-only");
  });

  it("requires explicit investigation support for repair authorization", () => {
    expect(decideDiagnosticRepair(
      incident("proven-with-observed-outcome"),
      investigation(false),
      "LIVE_MINECRAFT",
    ).disposition).toBe("proposal-only");
  });

  it("allows only guarded repair for a proven dependency violation", () => {
    expect(decideDiagnosticRepair(
      incident("proven-dependency-violation"),
      investigation(true),
      "REMOTE_GITHUB",
    ).disposition).toBe("guarded-repair-eligible");
  });

  it("allows full repair only with runtime-observed outcome and probe support", () => {
    expect(decideDiagnosticRepair(
      incident("proven-with-observed-outcome"),
      investigation(true),
      "LIVE_MINECRAFT",
    )).toMatchObject({
      disposition: "repair-eligible",
      selectedCandidateId: "chunk",
      claimStrength: "proven-runtime",
    });
  });

  it("keeps repair closed while multiple candidates remain", () => {
    const base = incident("proven-with-observed-outcome");
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
    ).disposition).toBe("observe-only");
  });

  it("blocks runtime repair when current-state evidence integrity is unsafe", () => {
    const decision = decideDiagnosticRepair(
      incident("proven-with-observed-outcome"),
      investigation(true),
      "LIVE_MINECRAFT",
      {
        records: 2,
        observedRecords: 2,
        derivedRecords: 0,
        unknownConfidenceRecords: 0,
        unlocatedObservedRecords: 0,
        unresolvedConflictPredicates: ["chunk-ready"],
        resolvedConflictCount: 0,
        telemetryContinuityComplete: true,
        safeForCurrentStateClaims: false,
        safeForTemporalViolationClaims: false,
        reasons: ["Unresolved conflicting runtime evidence."],
      },
    );

    expect(decision.disposition).toBe("proposal-only");
    expect(decision.reasons.join(" ")).toMatch(/integrity/i);
  });

});
