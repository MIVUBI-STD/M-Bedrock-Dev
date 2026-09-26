export type PreservationInvariantBaselineState =
  | "satisfied"
  | "violated"
  | "unknown";

export interface PreservationInvariantBaselineRecord {
  invariantId: string;
  state: PreservationInvariantBaselineState;
  evidenceIds: readonly string[];
}

export interface RepairPreservationContract {
  schemaVersion: 1;
  id: string;
  transactionId: string;
  mustChangeInvariantIds: readonly string[];
  mustPreserveInvariantIds: readonly string[];
  allowedSideEffectIds?: readonly string[];
  forbiddenSideEffectIds?: readonly string[];
  semanticTracePolicyId?: string;
}

export interface RepairPreservationBaseline {
  schemaVersion: 1;
  contractId: string;
  sourceFingerprint: string;
  targetProfileFingerprint?: string;
  invariantResults: readonly PreservationInvariantBaselineRecord[];
}

export type PreservationReadinessDisposition =
  | "ready"
  | "blocked";

export interface PreservationReadinessResult {
  contractId: string;
  transactionId: string;
  disposition: PreservationReadinessDisposition;
  baselineEvidenceIds: readonly string[];
  reasons: readonly string[];
}

export interface PreservationVerificationReceipt {
  contractId: string;
  transactionId: string;
  passed: boolean;
  verifiedMustChangeInvariantIds: readonly string[];
  verifiedMustPreserveInvariantIds: readonly string[];
  evidenceIds: readonly string[];
  semanticTraceDisposition?:
    | "equivalent"
    | "changed-as-intended"
    | "violated"
    | "unknown";
  unexpectedBehaviorKeys?: readonly string[];
  observedForbiddenSideEffectIds?: readonly string[];
  reasons?: readonly string[];
}
