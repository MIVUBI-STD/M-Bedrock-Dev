import type { DiagnosticSeverity } from "../diagnostics/src/types.js";
import type { SourceRef } from "./source-ref.js";

export type CausalLinkStrength =
  | "direct-evidence"
  | "dependency-supported"
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
