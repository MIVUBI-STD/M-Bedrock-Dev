import type {
  CausalIncident,
  CausalProofState,
  DiagnosticClaimStrength,
  DiagnosticEvidenceCeiling,
  DiagnosticRepairDecision,
  DiagnosticExecutionContext,
  RootCauseCandidate,
  RootCauseEvidenceLevel,
  RuntimeEvidenceIntegrityReport,
} from "../../../project-model/src/index.js";
import {
  causalInterventionSupportsFactors,
  causalInterventionSupportsPredicates,
  causalProofAtLeast,
  causalProofRank,
  legacyEvidenceToCausalProofState,
  lowerCausalProofState,
  validateCausalInterventionProvenance,
} from "../../../project-model/src/index.js";
import type { DiagnosticInvestigationState } from "./diagnostic-investigation.js";

const evidenceRank: Readonly<Record<RootCauseEvidenceLevel, number>> = {
  "unproven-candidate": 0,
  "corroborated-candidate": 1,
  "proven-dependency-violation": 2,
  "proven-with-observed-outcome": 3,
};

const evidenceByRank: readonly RootCauseEvidenceLevel[] = [
  "unproven-candidate",
  "corroborated-candidate",
  "proven-dependency-violation",
  "proven-with-observed-outcome",
];

function maximumProofForContext(
  context: DiagnosticExecutionContext,
): CausalProofState {
  switch (context) {
    case "REMOTE_GITHUB":
    case "LOCAL_ARTIFACT":
      return "localized";
    case "LOCAL_MINECRAFT":
      return "causal";
    case "LIVE_MINECRAFT":
      return "target-release-proven";
  }
}

export function diagnosticEvidenceCeiling(
  context: DiagnosticExecutionContext,
): DiagnosticEvidenceCeiling {
  if (context === "REMOTE_GITHUB" || context === "LOCAL_ARTIFACT") {
    return {
      context,
      maximumEvidenceLevel: "proven-dependency-violation",
      maximumClaimStrength: "proven-static",
      maximumProofState: maximumProofForContext(context),
    };
  }

  return {
    context,
    maximumEvidenceLevel: "proven-with-observed-outcome",
    maximumClaimStrength: "proven-runtime",
    maximumProofState: maximumProofForContext(context),
  };
}

export function capRootCauseEvidenceLevel(
  level: RootCauseEvidenceLevel,
  context: DiagnosticExecutionContext,
): RootCauseEvidenceLevel {
  const ceiling = diagnosticEvidenceCeiling(context);
  const rank = Math.min(
    evidenceRank[level],
    evidenceRank[ceiling.maximumEvidenceLevel],
  );
  return evidenceByRank[rank]!;
}

export function capCausalProofState(
  state: CausalProofState,
  context: DiagnosticExecutionContext,
): CausalProofState {
  return lowerCausalProofState(state, maximumProofForContext(context));
}

function claimStrengthFor(
  proofState: CausalProofState,
): DiagnosticClaimStrength {
  if (causalProofAtLeast(proofState, "intervention-supported")) {
    return "proven-runtime";
  }
  if (causalProofAtLeast(proofState, "localized")) return "proven-static";
  if (causalProofAtLeast(proofState, "supported")) return "corroborated";
  return "hypothesis";
}

function candidateById(
  incident: CausalIncident,
  id: string,
): RootCauseCandidate | undefined {
  return incident.rootCauseCandidates.find((candidate) => candidate.id === id);
}

function mutationNeedsRuntimeIntegrity(
  proofState: CausalProofState,
): boolean {
  return causalProofAtLeast(proofState, "intervention-supported");
}

/**
 * Diagnostic repair eligibility is internal causal readiness only.
 * It never grants user approval or mutation authority.
 * Final authority belongs to Approved Bug/design-change + Repair Contract gates.
 */
export function decideDiagnosticRepair(
  incident: CausalIncident,
  investigation: DiagnosticInvestigationState,
  context: DiagnosticExecutionContext,
  integrity?: RuntimeEvidenceIntegrityReport,
): DiagnosticRepairDecision {
  if (incident.id !== investigation.incidentId) {
    throw new Error("Diagnostic repair decision incident mismatch.");
  }

  const active = [...investigation.activeCandidateIds].sort();

  if (active.length === 0) {
    return {
      incidentId: incident.id,
      activeCandidateIds: active,
      disposition: "observe-only",
      claimStrength: "hypothesis",
      proofState: "unknown",
      reasons: [
        "No active root-cause candidate remains; repair would be unsupported.",
      ],
    };
  }

  if (active.length > 1) {
    return {
      incidentId: incident.id,
      activeCandidateIds: active,
      disposition: "observe-only",
      claimStrength: "hypothesis",
      proofState: "unknown",
      reasons: [
        "Multiple root-cause candidates remain active.",
        "More discriminating evidence is required before repair-candidate selection.",
      ],
    };
  }

  const selected = candidateById(incident, active[0]!);
  if (!selected) {
    return {
      incidentId: incident.id,
      activeCandidateIds: active,
      disposition: "observe-only",
      claimStrength: "hypothesis",
      proofState: "unknown",
      reasons: ["Active candidate is not present in the causal incident."],
    };
  }

  const effectiveEvidenceLevel = capRootCauseEvidenceLevel(
    selected.evidenceLevel,
    context,
  );
  const rawProofState =
    selected.proof?.state ??
    legacyEvidenceToCausalProofState(selected.evidenceLevel);
  let proofState = capCausalProofState(rawProofState, context);
  const supportedByInvestigation =
    investigation.supportedCandidateIds.includes(selected.id);

  const controlledInterventionErrors =
    selected.proof?.interventionIds?.length
      ? validateCausalInterventionProvenance(selected.proof)
      : [];
  const controlledInterventionBoundToCandidate =
    selected.proof?.interventionIds?.length
      ? causalInterventionSupportsPredicates(
          selected.proof,
          selected.causalPredicateIds ?? [],
        )
      : true;

  const controlledFactorsBoundToCandidate =
    selected.proof?.interventionIds?.length
      ? causalInterventionSupportsFactors(
          selected.proof,
          selected.causalFactorIds ?? [],
        )
      : true;

  const base = {
    incidentId: incident.id,
    activeCandidateIds: active,
    selectedCandidateId: selected.id,
    effectiveEvidenceLevel,
  } as const;

  if (!supportedByInvestigation) {
    return {
      ...base,
      disposition: "proposal-only",
      proofState,
      ...(selected.proof === undefined ? {} : { causalProof: selected.proof }),
      claimStrength: claimStrengthFor(proofState),
      reasons: [
        "Exactly one candidate remains, but it has not been explicitly supported by a discriminating probe outcome.",
      ],
    };
  }

  if (
    selected.proof?.interventionIds?.length &&
    (
      controlledInterventionErrors.length > 0 ||
      !controlledInterventionBoundToCandidate ||
      !controlledFactorsBoundToCandidate
    )
  ) {
    proofState = capCausalProofState("localized", context);
    return {
      ...base,
      disposition: "proposal-only",
      proofState,
      causalProof: selected.proof,
      claimStrength: claimStrengthFor(proofState),
      reasons: [
        "Controlled-intervention proof is not sufficiently bound to this root-cause candidate.",
        ...(controlledInterventionErrors.length === 0
          ? []
          : controlledInterventionErrors),
        ...(
          controlledInterventionBoundToCandidate
            ? []
            : [
                "Root-cause candidate causal predicates are missing or are not covered by matched intervention provenance.",
              ]
        ),
        ...(
          controlledFactorsBoundToCandidate
            ? []
            : [
                "Root-cause candidate causal factors are missing or are not covered by controlled factor value provenance.",
              ]
        ),
      ],
    };
  }

  if (mutationNeedsRuntimeIntegrity(proofState)) {
    if (context !== "LOCAL_MINECRAFT" && context !== "LIVE_MINECRAFT") {
      proofState = capCausalProofState("localized", context);
      return {
        ...base,
        disposition: "proposal-only",
        proofState,
        claimStrength: claimStrengthFor(proofState),
        reasons: [
          "Mutation-level causal proof requires Minecraft runtime evidence.",
          "Static or artifact evidence may localize a defect but cannot establish an intervention result.",
        ],
      };
    }

    if (!integrity) {
      return {
        ...base,
        disposition: "proposal-only",
        proofState,
        claimStrength: claimStrengthFor(proofState),
        reasons: [
          "Mutation-level proof requires an explicit runtime evidence integrity report.",
          "Observed behavior without evidence sufficiency/continuity checks cannot establish repair-candidate readiness.",
        ],
      };
    }

    if (!integrity.safeForCurrentStateClaims) {
      return {
        ...base,
        disposition: "proposal-only",
        proofState,
        claimStrength: claimStrengthFor(proofState),
        reasons: [
          "Runtime evidence integrity does not permit a current-state repair claim.",
          ...integrity.reasons,
        ],
      };
    }

    if (!integrity.safeForTemporalViolationClaims) {
      proofState = "localized";
      return {
        ...base,
        disposition: "proposal-only",
        proofState,
        claimStrength: claimStrengthFor(proofState),
        reasons: [
          "Intervention and reproduction claims require temporally complete runtime evidence.",
          ...integrity.reasons,
        ],
      };
    }
  }

  if (causalProofAtLeast(proofState, "causal")) {
    return {
      ...base,
      disposition: "repair-eligible",
      proofState,
      ...(selected.proof === undefined ? {} : { causalProof: selected.proof }),
      claimStrength: claimStrengthFor(proofState),
      reasons: [
        "Exactly one candidate remains and the investigation supports it.",
        "Causal proof meets the internal repair-candidate threshold; mutation still requires workflow approval.",
        "Runtime evidence integrity satisfies the required claim classes.",
      ],
    };
  }

  if (causalProofAtLeast(proofState, "intervention-supported")) {
    return {
      ...base,
      disposition: "guarded-repair-eligible",
      proofState,
      ...(selected.proof === undefined ? {} : { causalProof: selected.proof }),
      claimStrength: claimStrengthFor(proofState),
      reasons: [
        "Exactly one candidate remains and the investigation supports it.",
        "An intervention/reproduction signal exists but causal proof is not yet complete.",
        "This status is internal repair readiness only; any guarded mutation still requires workflow approval.",
      ],
    };
  }

  const legacyCapped =
    selected.proof === undefined &&
    selected.evidenceLevel === "proven-with-observed-outcome";

  return {
    ...base,
    disposition: "proposal-only",
    proofState,
    claimStrength: claimStrengthFor(proofState),
    reasons: [
      "Evidence is below the repair-candidate proof threshold.",
      ...(legacyCapped
        ? [
            "Legacy runtime-observed outcome is treated as correlation, not causation.",
          ]
        : []),
      "A discriminating intervention and reproducible causal chain are still required.",
    ],
  };
}
