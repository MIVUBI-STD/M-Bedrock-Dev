import type {
  DecisionBasisRevision,
  DecisionLedgerSnapshot,
} from "../../project-model/src/decision-ledger.js";
import type {
  DiagnosticRepairDecision,
} from "../../project-model/src/diagnostic-decision.js";
import type {
  RepairAdmissionDecision,
} from "./repair-admission.js";
import type {
  RepairRuntimeVerificationResult,
} from "./repair-runtime-verification.js";
import type {
  StagedPackageVerificationResult,
} from "./repair-package-verification.js";
import type {
  RepairReleaseDecision,
} from "./repair-release-gate.js";
import {
  appendDecisionLedgerEntry,
} from "./decision-ledger.js";

export interface DecisionRecordContext {
  decisionId: string;
  basis: DecisionBasisRevision;
  upstreamDecisionIds?: readonly string[];
  evidenceIds?: readonly string[];
}

export function recordDiagnosticRepairDecision(
  ledger: DecisionLedgerSnapshot,
  decision: DiagnosticRepairDecision,
  context: DecisionRecordContext,
): DecisionLedgerSnapshot {
  return appendDecisionLedgerEntry(ledger, {
    id: context.decisionId,
    kind: "repair-authorization",
    incidentId: decision.incidentId,
    basis: context.basis,
    inputIds: [
      ...decision.activeCandidateIds,
      ...(context.upstreamDecisionIds ?? []),
    ],
    outputIds: [
      "repair-disposition:" + decision.disposition,
      ...(decision.selectedCandidateId === undefined
        ? []
        : ["root-cause:" + decision.selectedCandidateId]),
    ],
    evidenceIds: context.evidenceIds,
  });
}

export function recordRepairAdmissionDecision(
  ledger: DecisionLedgerSnapshot,
  decision: RepairAdmissionDecision,
  transactionId: string,
  context: DecisionRecordContext,
): DecisionLedgerSnapshot {
  return appendDecisionLedgerEntry(ledger, {
    id: context.decisionId,
    kind: "repair-admission",
    transactionId,
    basis: context.basis,
    inputIds: context.upstreamDecisionIds,
    outputIds: [
      "repair-admission:" + decision.disposition,
    ],
    evidenceIds: context.evidenceIds,
  });
}

export function recordRuntimeVerificationDecision(
  ledger: DecisionLedgerSnapshot,
  result: RepairRuntimeVerificationResult,
  transactionId: string,
  context: DecisionRecordContext,
): DecisionLedgerSnapshot {
  return appendDecisionLedgerEntry(ledger, {
    id: context.decisionId,
    kind: "runtime-verification",
    transactionId,
    basis: context.basis,
    inputIds: [
      ...result.satisfiedStateRequirementIds.map(
        (id) => "runtime-requirement:" + id,
      ),
      ...(context.upstreamDecisionIds ?? []),
    ],
    outputIds: [
      "runtime-verification:" +
        (result.passed ? "passed" : "failed"),
    ],
    evidenceIds: [
      ...result.evidenceIds,
      ...(context.evidenceIds ?? []),
    ],
  });
}

export function recordPackageVerificationDecision(
  ledger: DecisionLedgerSnapshot,
  result: StagedPackageVerificationResult,
  transactionId: string,
  context: DecisionRecordContext,
): DecisionLedgerSnapshot {
  return appendDecisionLedgerEntry(ledger, {
    id: context.decisionId,
    kind: "package-verification",
    transactionId,
    basis: context.basis,
    inputIds: context.upstreamDecisionIds,
    outputIds: [
      "package-verification:" +
        (result.ok ? "passed" : "failed"),
      ...(result.ok
        ? ["package-fingerprint:" + result.packageFingerprint]
        : []),
    ],
    evidenceIds: [
      ...(result.ok ? result.receipt.evidenceIds : []),
      ...(context.evidenceIds ?? []),
    ],
  });
}

export function recordReleaseDecision(
  ledger: DecisionLedgerSnapshot,
  decision: RepairReleaseDecision,
  context: DecisionRecordContext & {
    transactionId: string;
  },
): DecisionLedgerSnapshot {
  return appendDecisionLedgerEntry(ledger, {
    id: context.decisionId,
    kind: "release-admission",
    transactionId: context.transactionId,
    basis: context.basis,
    inputIds: context.upstreamDecisionIds,
    outputIds: [
      "release:" + decision.disposition,
    ],
    evidenceIds: context.evidenceIds,
  });
}
