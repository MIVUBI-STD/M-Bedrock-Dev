import type { DiagnosticSeverity } from "../diagnostics/src/types.js";
import type { SourceRef } from "./source-ref.js";

export type CausalLinkStrength =
  | "direct-evidence"
  | "dependency-supported"
  | "corroborated-risk"
  | "risk-only";

export type CausalNodeKind =
  | "observed-state"
  | "missing-requirement"
  | "violation"
  | "evidence-gap"
  | "downstream-risk"
  | "recovery";

export interface CausalNode {
  id: string;
  kind: CausalNodeKind;
  label: string;
  sourceRefs?: readonly SourceRef[];
  diagnosticIds?: readonly string[];
  corroboratingPredicates?: readonly string[];
  corroboratingSourceKeys?: readonly string[];
}

export interface CausalLink {
  from: string;
  to: string;
  strength: CausalLinkStrength;
  relationId?: string;
  rationale: string;
}

export interface CausalChain {
  id: string;
  scopeKey?: string;
  severity: DiagnosticSeverity;
  confidence: "high" | "medium" | "low";
  title: string;
  summary: string;
  nodes: readonly CausalNode[];
  links: readonly CausalLink[];
  relatedDiagnosticIds: readonly string[];
}


export type RootCauseEvidenceLevel =
  | "proven-with-observed-outcome"
  | "proven-dependency-violation"
  | "corroborated-candidate"
  | "unproven-candidate";

export interface RootCauseCandidate {
  id: string;
  label: string;
  evidenceLevel: RootCauseEvidenceLevel;
  severity: DiagnosticSeverity;
  confidence: "high" | "medium" | "low";
  chainIds: readonly string[];
  relatedDiagnosticIds: readonly string[];
  support: {
    dependencyViolations: number;
    evidenceGaps: number;
    corroboratedRisks: number;
    observedOutcomes: number;
  };
}

export interface CausalIncident {
  id: string;
  scopeKey: string;
  severity: DiagnosticSeverity;
  confidence: "high" | "medium" | "low";
  chainIds: readonly string[];
  relatedDiagnosticIds: readonly string[];
  nodes: readonly CausalNode[];
  links: readonly CausalLink[];
  rootCauseCandidates: readonly RootCauseCandidate[];
}
