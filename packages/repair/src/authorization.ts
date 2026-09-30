export type RepairEvidenceFreshness =
  | "fresh"
  | "stale"
  | "unknown";

export interface RepairAuthorizationInput {
  confirmedDefect: boolean;
  diagnosisEvidenceIds: readonly string[];
  invariantIds: readonly string[];
  sourceFingerprintMatches: boolean;
  evidenceFreshness: RepairEvidenceFreshness;
}

export interface RepairAuthorizationDecision {
  authorized: boolean;
  reasons: readonly string[];
}

export function authorizeRepair(
  input: RepairAuthorizationInput,
): RepairAuthorizationDecision {
  const reasons: string[] = [];

  if (!input.confirmedDefect) {
    reasons.push(
      "Repair requires a confirmed defect; candidate findings are not mutation authority.",
    );
  }
  if (input.diagnosisEvidenceIds.length === 0) {
    reasons.push(
      "Repair requires diagnosis evidence IDs.",
    );
  }
  if (input.invariantIds.length === 0) {
    reasons.push(
      "Repair requires at least one violated invariant.",
    );
  }
  if (!input.sourceFingerprintMatches) {
    reasons.push(
      "Source fingerprint changed since diagnosis; repair preconditions are stale.",
    );
  }
  if (input.evidenceFreshness !== "fresh") {
    reasons.push(
      input.evidenceFreshness === "stale"
        ? "Diagnosis evidence is stale for the current source/world revision."
        : "Diagnosis evidence freshness is unknown.",
    );
  }

  return {
    authorized: reasons.length === 0,
    reasons:
      reasons.length === 0
        ? [
            "Confirmed diagnosis, invariant authority, source identity, and evidence freshness authorize repair planning.",
          ]
        : reasons,
  };
}
