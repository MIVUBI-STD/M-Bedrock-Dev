import type {
  KnowledgeClassification,
  KnowledgeDiagnosticSeverity,
  KnowledgeDomain,
  KnowledgeRelationKind,
} from "../../knowledge/src/types.js";

export type CompiledInvariantKind =
  | "requires-state"
  | "requires-any-state"
  | "gated-state"
  | "deactivates-state"
  | "restores-state"
  | "temporal-order";

export interface CompiledDiagnosticInvariant {
  id: string;
  relationId: string;
  relationKind: KnowledgeRelationKind;
  invariantKind: CompiledInvariantKind;
  domain: KnowledgeDomain;
  subject: string;
  object: string;
  alternatives?: readonly string[];
  expectedObjectState?: "present" | "absent";
  beforePredicate?: string;
  afterPredicate?: string;
  classification?: KnowledgeClassification;
  diagnosticSeverity?: KnowledgeDiagnosticSeverity;
  knowledgeSourceIds: readonly string[];
  rationale?: string;
}

export interface InvariantCompilationSkip {
  relationId: string;
  relationKind: KnowledgeRelationKind;
  reason: string;
}

export interface InvariantCompilationResult {
  invariants: readonly CompiledDiagnosticInvariant[];
  skipped: readonly InvariantCompilationSkip[];
}
