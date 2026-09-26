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

export interface CausalProof {
  state: CausalProofState;
  evidenceIds?: readonly string[];
  interventionIds?: readonly string[];
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
