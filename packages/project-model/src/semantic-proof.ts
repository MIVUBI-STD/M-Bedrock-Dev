export type SemanticProofKind =
  | "static"
  | "semantic"
  | "formal"
  | "runtime"
  | "validation";

export interface SemanticProofClaim {
  schemaVersion: 1;
  claimId: string;
  claimRevision: string;
  kind: SemanticProofKind;
  basisNodeIds: readonly string[];
  basisFingerprint: string;
  evidenceIds: readonly string[];
  targetProfileFingerprint?: string;
  runtimeScopeKey?: string;
}
