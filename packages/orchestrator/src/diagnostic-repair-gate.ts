import type {
  CausalIncident,
  RootCauseCandidate,
  RootCauseEvidenceLevel,
} from "../../project-model/src/causal-chain.js";
import type {
  DiagnosticClaimStrength,
  DiagnosticEvidenceCeiling,
  DiagnosticRepairDecision,
} from "../../project-model/src/diagnostic-decision.js";
import type { DiagnosticExecutionContext } from "../../project-model/src/diagnostic-probe.js";
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

export function diagnosticEvidenceCeiling(
  context: DiagnosticExecutionContext,
): DiagnosticEvidenceCeiling {
  if (context === "REMOTE_GITHUB" || context === "LOCAL_ARTIFACT") {
    return {
      context,
      maximumEvidenceLevel: "proven-dependency-violation",
      maximumClaimStrength: "proven-static",
    };
  }

  return {
    context,
    maximumEvidenceLevel: "proven-with-observed-outcome",
    maximumClaimStrength: "proven-runtime",
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

function claimStrengthFor(
  level: RootCauseEvidenceLevel,
): DiagnosticClaimStrength {
  switch (level) {
    case "unproven-candidate":
      return "hypothesis";
    case "corroborated-candidate":
      return "corroborated";
    case "proven-dependency-violation":
      return "proven-static";
    case "proven-with-observed-outcome":
      return "proven-runtime";
  }
}

function candidateById(
  incident: CausalIncident,
  id: string,
): RootCauseCandidate | undefined {
  return incident.rootCauseCandidates.find((candidate) => candidate.id === id);
}

export function decideDiagnosticRepair(
  incident: CausalIncident,
  investigation: DiagnosticInvestigationState,
  context: DiagnosticExecutionContext,
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
      reasons: [
        "Multiple root-cause candidates remain active.",
        "More discriminating evidence is required before repair authorization.",
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
      reasons: ["Active candidate is not present in the causal incident."],
    };
  }

  const effectiveEvidenceLevel = capRootCauseEvidenceLevel(
    selected.evidenceLevel,
    context,
  );
  const claimStrength = claimStrengthFor(effectiveEvidenceLevel);
  const supportedByInvestigation =
    investigation.supportedCandidateIds.includes(selected.id);

  if (
    effectiveEvidenceLevel === "proven-with-observed-outcome" &&
    supportedByInvestigation
  ) {
    return {
      incidentId: incident.id,
      activeCandidateIds: active,
      disposition: "repair-eligible",
      selectedCandidateId: selected.id,
      effectiveEvidenceLevel,
      claimStrength,
      reasons: [
        "Exactly one candidate remains.",
        "Runtime-observed outcome supports the candidate.",
        "Investigation evidence explicitly supports the candidate.",
      ],
    };
  }

  if (
    effectiveEvidenceLevel === "proven-dependency-violation" &&
    supportedByInvestigation
  ) {
    return {
      incidentId: incident.id,
      activeCandidateIds: active,
      disposition: "guarded-repair-eligible",
      selectedCandidateId: selected.id,
      effectiveEvidenceLevel,
      claimStrength,
      reasons: [
        "Exactly one candidate remains.",
        "A dependency violation is proven within the available evidence ceiling.",
        "Repair must remain guarded until downstream behavior is verified.",
      ],
    };
  }

  return {
    incidentId: incident.id,
    activeCandidateIds: active,
    disposition: "proposal-only",
    selectedCandidateId: selected.id,
    effectiveEvidenceLevel,
    claimStrength,
    reasons: [
      "Exactly one candidate remains, but causal evidence is below the repair threshold.",
      supportedByInvestigation
        ? "The investigation supports the candidate but does not prove the required causal level."
        : "The candidate has not been explicitly supported by a discriminating probe outcome.",
    ],
  };
}
