import type { RootCauseEvidenceLevel } from "./causal-chain.js";

export type CausalProofState =
  | "unknown"
  | "plausible"
  | "supported"
  | "correlated"
  | "localized"
  | "intervention-supported"
  | "reproduced"
  | "causal"
  | "repair-verified"
  | "preservation-verified"
  | "target-release-proven";

const PROOF_RANK: Readonly<Record<CausalProofState, number>> = {
  unknown: 0,
  plausible: 1,
  supported: 2,
  correlated: 3,
  localized: 4,
  "intervention-supported": 5,
  reproduced: 6,
  causal: 7,
  "repair-verified": 8,
  "preservation-verified": 9,
  "target-release-proven": 10,
};

export interface CausalInterventionProvenance {
  interventionId: string;
  experimentRevision?: string;
  predicateId?: string;
  controlledFactorIds?: readonly string[];
  controlState?: "present" | "absent";
  treatmentState?: "present" | "absent";
  expectedContrastDisposition?: "matched" | "mismatched" | "unspecified";
  targetProfileFingerprint?: string;
  fixtureFingerprint?: string;
  evidenceIds?: readonly string[];
}

export interface CausalProof {
  state: CausalProofState;
  evidenceIds?: readonly string[];
  interventionIds?: readonly string[];
  interventionProvenance?: readonly CausalInterventionProvenance[];
  reproductionIds?: readonly string[];
  preservationInvariantIds?: readonly string[];
  targetProfileFingerprint?: string;
  note?: string;
}

export function causalProofRank(state: CausalProofState): number {
  return PROOF_RANK[state];
}

export function causalProofAtLeast(
  actual: CausalProofState | undefined,
  required: CausalProofState,
): boolean {
  return actual !== undefined &&
    causalProofRank(actual) >= causalProofRank(required);
}

export function lowerCausalProofState(
  left: CausalProofState,
  right: CausalProofState,
): CausalProofState {
  return causalProofRank(left) <= causalProofRank(right) ? left : right;
}

export function legacyEvidenceToCausalProofState(
  level: RootCauseEvidenceLevel,
): CausalProofState {
  switch (level) {
    case "unproven-candidate":
      return "plausible";
    case "corroborated-candidate":
      return "supported";
    case "proven-dependency-violation":
      return "localized";
    case "proven-with-observed-outcome":
      // Observation plus correlation is not an intervention and does not
      // establish causation. Legacy runtime proof is intentionally capped.
      return "correlated";
  }
}

export function validateCausalInterventionProvenance(
  proof: CausalProof,
): string[] {
  const errors: string[] = [];
  const interventionIds = [...new Set(proof.interventionIds ?? [])].sort();
  const provenance = proof.interventionProvenance ?? [];

  if (interventionIds.length === 0) {
    if (provenance.length > 0) {
      errors.push(
        "Causal intervention provenance exists without interventionIds.",
      );
    }
    return errors;
  }

  const provenanceIds = provenance.map((item) => item.interventionId);
  for (const id of interventionIds) {
    const matches = provenance.filter(
      (item) => item.interventionId === id,
    );
    if (matches.length === 0) {
      errors.push(
        "Causal intervention " + id + " is missing provenance.",
      );
      continue;
    }
    const seenPredicates = new Set<string>();
    for (const item of matches) {
      const predicateKey = item.predicateId ?? "";
      if (seenPredicates.has(predicateKey)) {
        errors.push(
          "Causal intervention " +
            id +
            " has duplicate provenance for predicate " +
            (predicateKey || "<missing>") +
            ".",
        );
      }
      seenPredicates.add(predicateKey);
      if (!item.predicateId?.trim()) {
        errors.push(
          "Causal intervention " + id + " is missing predicate provenance.",
        );
      }
      if (
        !item.controlledFactorIds ||
        item.controlledFactorIds.length === 0
      ) {
        errors.push(
          "Causal intervention " + id + " is missing controlled factor provenance.",
        );
      }
      if (
        item.controlState === undefined ||
        item.treatmentState === undefined
      ) {
        errors.push(
          "Causal intervention " + id + " is missing control/treatment state provenance.",
        );
      } else if (item.controlState === item.treatmentState) {
        errors.push(
          "Causal intervention " + id + " does not describe a control/treatment contrast.",
        );
      }
      if (item.expectedContrastDisposition !== "matched") {
        errors.push(
          "Causal intervention " + id + " is not bound to a matched expected contrast.",
        );
      }
      if (!item.targetProfileFingerprint?.trim()) {
        errors.push(
          "Causal intervention " + id + " is missing target runtime provenance.",
        );
      }
      if (!item.fixtureFingerprint?.trim()) {
        errors.push(
          "Causal intervention " + id + " is missing fixture provenance.",
        );
      }
      if (!item.experimentRevision?.trim()) {
        errors.push(
          "Causal intervention " + id + " is missing experiment revision provenance.",
        );
      }
      if (!item.evidenceIds || item.evidenceIds.length === 0) {
        errors.push(
          "Causal intervention " + id + " is missing supporting evidence provenance.",
        );
      }
    }
  }

  for (const id of provenanceIds) {
    if (!interventionIds.includes(id)) {
      errors.push(
        "Causal intervention provenance references undeclared intervention " +
          id +
          ".",
      );
    }
  }

  return errors;
}

export function causalInterventionSupportsPredicates(
  proof: CausalProof,
  predicateIds: readonly string[],
): boolean {
  if (predicateIds.length === 0) return false;
  const provenance = proof.interventionProvenance ?? [];
  return predicateIds.every((predicateId) =>
    provenance.some(
      (item) =>
        item.predicateId === predicateId &&
        item.expectedContrastDisposition === "matched",
    )
  );
}
