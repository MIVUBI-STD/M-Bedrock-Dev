export type DecisionLedgerKind =
  | "diagnostic-candidate-selection"
  | "repair-authorization"
  | "repair-admission"
  | "repair-strategy-selection"
  | "transitive-revalidation"
  | "runtime-verification"
  | "package-verification"
  | "release-admission";

export type DecisionLedgerStatus =
  | "active"
  | "superseded"
  | "invalidated";

export interface DecisionBasisRevision {
  sourceFingerprint?: string;
  graphFingerprint?: string;
  knowledgeRevision?: string;
  invariantRegistryRevision?: string;
  targetProfileFingerprint?: string;
  probeBindingRevision?: string;
}

export interface DecisionLedgerEntry {
  id: string;
  kind: DecisionLedgerKind;
  status: DecisionLedgerStatus;
  incidentId?: string;
  transactionId?: string;
  basis: DecisionBasisRevision;
  upstreamDecisionIds: readonly string[];
  inputIds: readonly string[];
  outputIds: readonly string[];
  evidenceIds: readonly string[];
  createdSequence: number;
  invalidationReason?: string;
  supersededBy?: string;
}

export interface DecisionLedgerSnapshot {
  schemaVersion: 1;
  entries: readonly DecisionLedgerEntry[];
}
