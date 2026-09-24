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
  RepairLifecycleState,
} from "./repair-lifecycle.js";
import type {
  RepairProofBundle,
} from "./repair-proof-bundle.js";
import {
  decideRepairReleaseWithLineage,
  type RepairReleaseLineageResult,
} from "./repair-release-lineage.js";
import type {
  RepairStrategySelection,
} from "./repair-strategy-selection.js";
import {
  appendDecisionLedgerEntry,
} from "./decision-ledger.js";

export interface DecisionRecordContext {
  decisionId: string;
  basis: DecisionBasisRevision;
  upstreamDecisionIds?: readonly string[];
  evidenceIds?: readonly string[];
}

function requireRuntimeEvidenceRevision(
  basis: DecisionBasisRevision,
  label: string,
): void {
  if (!basis.runtimeEvidenceRevision?.trim()) {
    throw new Error(
      label +
        " requires runtimeEvidenceRevision in the decision basis.",
    );
  }
}

export function recordDiagnosticRepairDecision(
  ledger: DecisionLedgerSnapshot,
  decision: DiagnosticRepairDecision,
  context: DecisionRecordContext,
): DecisionLedgerSnapshot {
  if (decision.claimStrength === "proven-runtime") {
    requireRuntimeEvidenceRevision(
      context.basis,
      "Runtime-proven repair authorization",
    );
  }

  return appendDecisionLedgerEntry(ledger, {
    id: context.decisionId,
    kind: "repair-authorization",
    incidentId: decision.incidentId,
    basis: context.basis,
    inputIds: [
      ...decision.activeCandidateIds,
    ],
    ...(context.upstreamDecisionIds === undefined
      ? {}
      : { upstreamDecisionIds: context.upstreamDecisionIds }),
    outputIds: [
      "repair-disposition:" + decision.disposition,
      ...(decision.selectedCandidateId === undefined
        ? []
        : ["root-cause:" + decision.selectedCandidateId]),
    ],
    ...(context.evidenceIds === undefined
      ? {}
      : { evidenceIds: context.evidenceIds }),
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
    ...(context.upstreamDecisionIds === undefined
      ? {}
      : { upstreamDecisionIds: context.upstreamDecisionIds }),
    outputIds: [
      "repair-admission:" + decision.disposition,
    ],
    ...(context.evidenceIds === undefined
      ? {}
      : { evidenceIds: context.evidenceIds }),
  });
}

export function recordRuntimeVerificationDecision(
  ledger: DecisionLedgerSnapshot,
  result: RepairRuntimeVerificationResult,
  transactionId: string,
  context: DecisionRecordContext,
): DecisionLedgerSnapshot {
  requireRuntimeEvidenceRevision(
    context.basis,
    "Runtime verification decision",
  );

  return appendDecisionLedgerEntry(ledger, {
    id: context.decisionId,
    kind: "runtime-verification",
    transactionId,
    basis: context.basis,
    inputIds: [
      ...result.satisfiedStateRequirementIds.map(
        (id) => "runtime-requirement:" + id,
      ),
    ],
    ...(context.upstreamDecisionIds === undefined
      ? {}
      : { upstreamDecisionIds: context.upstreamDecisionIds }),
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
    ...(context.upstreamDecisionIds === undefined
      ? {}
      : { upstreamDecisionIds: context.upstreamDecisionIds }),
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

export interface ReleaseDecisionRecordingResult {
  ledger: DecisionLedgerSnapshot;
  release: RepairReleaseLineageResult;
  recorded: boolean;
}

export function recordReleaseDecision(
  ledger: DecisionLedgerSnapshot,
  lifecycle: RepairLifecycleState,
  proof: RepairProofBundle,
  currentBasis: DecisionBasisRevision,
  context: Omit<
    DecisionRecordContext,
    "basis" | "upstreamDecisionIds"
  >,
): ReleaseDecisionRecordingResult {
  const release = decideRepairReleaseWithLineage(
    lifecycle,
    proof,
    ledger,
    currentBasis,
  );

  if (
    release.decision.disposition !==
      "release-eligible"
  ) {
    return {
      ledger: release.ledger,
      release,
      recorded: false,
    };
  }

  const nextLedger = appendDecisionLedgerEntry(
    release.ledger,
    {
      id: context.decisionId,
      kind: "release-admission",
      transactionId: release.decision.transactionId,
      basis: { ...currentBasis },
      upstreamDecisionIds:
        release.lineageDecisionIds,
      outputIds: ["release:release-eligible"],
      ...(context.evidenceIds === undefined
        ? {}
        : { evidenceIds: context.evidenceIds }),
    },
  );

  return {
    ledger: nextLedger,
    release,
    recorded: true,
  };
}


export function recordRepairStrategySelection(
  ledger: DecisionLedgerSnapshot,
  selection: RepairStrategySelection,
  transactionId: string | undefined,
  context: DecisionRecordContext,
): DecisionLedgerSnapshot {
  const outputIds =
    selection.status === "selected"
      ? [
          "repair-strategy:selected",
          "repair-strategy:" + selection.selected.strategyId,
          "repair-transaction:" + selection.selected.transactionId,
          ...selection.selected.pipeline.proof.supportingInvariantIds.map(
            (id) => "repair-invariant:" + id,
          ),
        ]
      : selection.status === "ambiguous"
        ? [
            "repair-strategy:ambiguous",
            ...selection.tied.map(
              (item) => "repair-strategy:" + item.strategyId,
            ),
          ]
        : ["repair-strategy:none-eligible"];

  return appendDecisionLedgerEntry(ledger, {
    id: context.decisionId,
    kind: "repair-strategy-selection",
    ...(transactionId === undefined
      ? {}
      : { transactionId }),
    basis: context.basis,
    ...(context.upstreamDecisionIds === undefined
      ? {}
      : { upstreamDecisionIds: context.upstreamDecisionIds }),
    outputIds,
    ...(context.evidenceIds === undefined
      ? {}
      : { evidenceIds: context.evidenceIds }),
  });
}


export function recordTransitiveRevalidationDecision(
  ledger: DecisionLedgerSnapshot,
  input: {
    transactionId: string;
    passed: boolean;
    validatedNodeIds: readonly string[];
    validatedPaths: readonly string[];
    evidenceIds: readonly string[];
  },
  context: DecisionRecordContext,
): DecisionLedgerSnapshot {
  return appendDecisionLedgerEntry(ledger, {
    id: context.decisionId,
    kind: "transitive-revalidation",
    transactionId: input.transactionId,
    basis: context.basis,
    ...(context.upstreamDecisionIds === undefined
      ? {}
      : { upstreamDecisionIds: context.upstreamDecisionIds }),
    inputIds: [
      ...input.validatedNodeIds.map(
        (id) => "revalidation-node:" + id,
      ),
      ...input.validatedPaths.map(
        (path) => "revalidation-path:" + path,
      ),
    ],
    outputIds: [
      "transitive-revalidation:" +
        (input.passed ? "passed" : "failed"),
    ],
    evidenceIds: [
      ...input.evidenceIds,
      ...(context.evidenceIds ?? []),
    ],
  });
}
