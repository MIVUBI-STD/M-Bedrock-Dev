export type RepairEvidenceFreshness =
  | "fresh"
  | "stale"
  | "unknown";

export interface RepairAuthorizationInput {
  confirmedDefect: boolean;
  diagnosisEvidenceIds: readonly string[];
  invariantIds: readonly string[];
  sourceFingerprint: string;
  sourceFingerprintMatches: boolean;
  evidenceFreshness: RepairEvidenceFreshness;
}

export interface RepairAuthorizationReceipt {
  schemaVersion: 1;
  authorized: true;
  sourceFingerprint: string;
  diagnosisEvidenceIds: readonly string[];
  invariantIds: readonly string[];
  evidenceFreshness: "fresh";
}

export interface RepairAuthorizationDecision {
  authorized: boolean;
  reasons: readonly string[];
  receipt?: RepairAuthorizationReceipt;
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
  if (!input.sourceFingerprint.trim()) {
    reasons.push(
      "Repair authorization requires the diagnosed source fingerprint.",
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

  if (reasons.length > 0) {
    return {
      authorized: false,
      reasons,
    };
  }

  return {
    authorized: true,
    reasons: [
      "Confirmed diagnosis, invariant authority, source identity, and evidence freshness authorize repair planning.",
    ],
    receipt: {
      schemaVersion: 1,
      authorized: true,
      sourceFingerprint:
        input.sourceFingerprint,
      diagnosisEvidenceIds: [
        ...new Set(
          input.diagnosisEvidenceIds,
        ),
      ].sort(),
      invariantIds: [
        ...new Set(input.invariantIds),
      ].sort(),
      evidenceFreshness: "fresh",
    },
  };
}
