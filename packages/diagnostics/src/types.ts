import type { SourceRef } from "../../project-model/src/source-ref.js";

export type DiagnosticSeverity = "info" | "minor" | "medium" | "critical";

export type DiagnosticCode =
  | "UNRESOLVED_REFERENCE"
  | "AMBIGUOUS_REFERENCE"
  | "DUPLICATE_MANIFEST_UUID"
  | "SUSPICIOUS_REGION_MUTATION"
  | "UNKNOWN_COMMAND_EFFECT"
  | "CROSS_SCOPE_STATE_RISK";

export interface DiagnosticFinding {
  id: string;
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  message: string;
  source?: SourceRef;
  relatedNodeIds?: readonly string[];
  data?: Readonly<Record<string, unknown>>;
}
