import type { RootCauseEvidenceLevel } from "./causal-chain.js";
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
}

export interface DiagnosticRepairDecision {
  incidentId: string;
  activeCandidateIds: readonly string[];
  disposition: DiagnosticRepairDisposition;
  selectedCandidateId?: string;
  effectiveEvidenceLevel?: RootCauseEvidenceLevel;
  claimStrength: DiagnosticClaimStrength;
  reasons: readonly string[];
}
