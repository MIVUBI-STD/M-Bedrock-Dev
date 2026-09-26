import type { RootCauseEvidenceLevel } from "./causal-chain.js";
import type { CausalProofState } from "./causal-proof.js";
import type { DiagnosticExecutionContext } from "./diagnostic-probe.js";

export type DiagnosticClaimStrength =
  | "hypothesis"
  | "corroborated"
  | "proven-static"
  | "proven-runtime";

export type DiagnosticRepairDisposition =
  | "observe-only"
  | "proposal-only"
  | "guarded-repair-eligible"
  | "repair-eligible";

export interface DiagnosticEvidenceCeiling {
  context: DiagnosticExecutionContext;
  maximumEvidenceLevel: RootCauseEvidenceLevel;
  maximumClaimStrength: DiagnosticClaimStrength;
  maximumProofState?: CausalProofState;
}

export interface DiagnosticRepairDecision {
  incidentId: string;
  activeCandidateIds: readonly string[];
  disposition: DiagnosticRepairDisposition;
  selectedCandidateId?: string;
  effectiveEvidenceLevel?: RootCauseEvidenceLevel;
  proofState?: CausalProofState;
  claimStrength: DiagnosticClaimStrength;
  reasons: readonly string[];
}
