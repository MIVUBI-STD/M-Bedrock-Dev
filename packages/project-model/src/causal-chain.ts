import type { Severity } from "../../common/src/severity.js";
import type { SourceRef } from "./source-ref.js";
import type { RuntimeScope } from "./runtime-evidence.js";

export type CausalLinkStrength =
  | "direct-evidence"
  | "dependency-supported"
  | "corroborated-risk"
  | "risk-only";

export type CausalTemporalStatus =
  | "after-subject"
  | "before-subject"
  | "same-moment"
  | "unresolved";

export type CausalTemporalIntegrity =
  | "complete"
  | "incomplete";

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
  temporalStatus?: CausalTemporalStatus;
  temporalIntegrity?: CausalTemporalIntegrity;
  rationale: string;
}

export interface CausalChain {
  id: string;
  scopeKey?: string;
  scope?: RuntimeScope;
  severity: Severity;
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
  severity: Severity;
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
  scope?: RuntimeScope;
  severity: Severity;
  confidence: "high" | "medium" | "low";
  chainIds: readonly string[];
  relatedDiagnosticIds: readonly string[];
  nodes: readonly CausalNode[];
  links: readonly CausalLink[];
  rootCauseCandidates: readonly RootCauseCandidate[];
}
