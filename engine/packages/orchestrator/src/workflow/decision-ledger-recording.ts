import type {
  DecisionBasisRevision,
  DecisionLedgerSnapshot,
} from "../../../project-model/src/index.js";
import type {
  DiagnosticRepairDecision,
} from "../../../project-model/src/index.js";
import type {
  RepairAdmissionDecision,
} from "../repair/repair-admission.js";
import type {
  RepairRuntimeVerificationResult,
} from "../repair/repair-runtime-verification.js";
import type {
  RepairPreservationVerificationResult,
} from "../repair/repair-preservation-verification.js";
import type {
  StagedPackageVerificationResult,
} from "../repair/repair-package-verification.js";
import type {
  RepairLifecycleState,
} from "../repair/repair-lifecycle.js";
import type {
  RepairProofBundle,
} from "../repair/repair-proof-bundle.js";
import {
  decideRepairReleaseWithLineage,
  type RepairReleaseLineageResult,
} from "../repair/repair-release-lineage.js";
import {
  repairStrategyPostTransformProofRevision,
  type RepairStrategySelection,
} from "../repair/repair-strategy-selection.js";
import type {
  ProviderBackedRepairStrategySelection,
} from "../repair/provider-backed-repair-selection.js";
import type {
  RepairRealizationCoverageReport,
} from "../repair/repair-realization-coverage.js";
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
      ...(result.receipt?.runtimeExperimentContract === undefined
        ? []
        : [
            "runtime-experiment:" +
              result.receipt.runtimeExperimentContract.interventionId,
            "runtime-experiment-revision:" +
              result.receipt.runtimeExperimentContract.experimentRevision,
            "runtime-target-profile:" +
              result.receipt.runtimeExperimentContract.targetProfileFingerprint,
            "runtime-fixture:" +
              result.receipt.runtimeExperimentContract.fixtureFingerprint,
            ...result.receipt.runtimeExperimentContract.predicateIds.map(
              (id) => "runtime-predicate:" + id,
            ),
          ]),
    ],
    ...(context.upstreamDecisionIds === undefined
      ? {}
      : { upstreamDecisionIds: context.upstreamDecisionIds }),
    outputIds: [
      "runtime-verification:" +
        (result.passed ? "passed" : "failed"),
      ...(result.receipt?.runtimeExperimentContract === undefined
        ? []
        : [
            "runtime-verification-contract:" +
              result.receipt.runtimeExperimentContract.interventionId +
              "@" +
              result.receipt.runtimeExperimentContract.experimentRevision,
          ]),
    ],
    evidenceIds: [
      ...result.evidenceIds,
      ...(context.evidenceIds ?? []),
    ],
  });
}

export function recordPreservationVerificationDecision(
  ledger: DecisionLedgerSnapshot,
  result: RepairPreservationVerificationResult,
  transactionId: string,
  context: DecisionRecordContext,
): DecisionLedgerSnapshot {
  requireRuntimeEvidenceRevision(
    context.basis,
    "Preservation verification decision",
  );
  if (
    !context.basis.preservationContractRevision?.trim() ||
    !context.basis.preservationBaselineRevision?.trim()
  ) {
    throw new Error(
      "Preservation verification decision requires preservation contract and baseline revisions in the decision basis.",
    );
  }

  return appendDecisionLedgerEntry(ledger, {
    id: context.decisionId,
    kind: "preservation-verification",
    transactionId,
    basis: context.basis,
    inputIds: [
      ...result.verifiedMustChangeInvariantIds.map(
        (id) => "must-change-invariant:" + id,
      ),
      ...result.verifiedMustPreserveInvariantIds.map(
        (id) => "must-preserve-invariant:" + id,
      ),
    ],
    ...(context.upstreamDecisionIds === undefined
      ? {}
      : { upstreamDecisionIds: context.upstreamDecisionIds }),
    outputIds: [
      "preservation-verification:" +
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


export function recordRepairRealizationCoverage(
  ledger: DecisionLedgerSnapshot,
  report: RepairRealizationCoverageReport,
  context: DecisionRecordContext,
): DecisionLedgerSnapshot {
  if (
    !context.basis.repairRealizerRegistryRevision?.trim()
  ) {
    throw new Error(
      "Repair realization coverage requires repairRealizerRegistryRevision in the decision basis.",
    );
  }

  return appendDecisionLedgerEntry(ledger, {
    id: context.decisionId,
    kind: "repair-strategy-realization",
    incidentId: report.incidentId,
    basis: context.basis,
    ...(context.upstreamDecisionIds === undefined
      ? {}
      : {
          upstreamDecisionIds:
            context.upstreamDecisionIds,
        }),
    inputIds: [
      "root-cause:" + report.candidateId,
    ],
    outputIds: [
      "repair-realization:realized:" +
        report.realizedCount,
      "repair-realization:blocked:" +
        report.blockedCount,
      "repair-realization:missing-realizer:" +
        report.missingRealizerCount,
      "repair-realization:no-implementation-coverage:" +
        String(report.noImplementationCoverage),
      ...report.items.map(
        (item) =>
          "repair-realization-source:" +
          item.sourceId +
          "@" +
          item.sourceVersion +
          ":" +
          item.disposition,
      ),
    ],
    ...(context.evidenceIds === undefined
      ? {}
      : { evidenceIds: context.evidenceIds }),
  });
}

export interface RepairStrategyDecisionRecordContext
  extends DecisionRecordContext {
  providerProvenance?: readonly {
    providerId: string;
    providerVersion: string;
  }[];
  sourceProvenance?: readonly {
    sourceKind: string;
    sourceId: string;
    sourceVersion: string;
  }[];
  realizerProvenance?: readonly {
    realizerId: string;
    realizerVersion: string;
  }[];
}

export function recordRepairStrategySelection(
  ledger: DecisionLedgerSnapshot,
  selection: RepairStrategySelection,
  transactionId: string | undefined,
  context: RepairStrategyDecisionRecordContext,
): DecisionLedgerSnapshot {
  const selectedPostTransformProof =
    selection.status === "selected"
      ? selection.selected.intelligence
          .postTransformProof
      : undefined;
  const selectedPostTransformProofRevision =
    repairStrategyPostTransformProofRevision(
      selectedPostTransformProof,
    );

  if (
    selectedPostTransformProofRevision !== undefined &&
    context.basis.postTransformProofRevision !== undefined &&
    context.basis.postTransformProofRevision !==
      selectedPostTransformProofRevision
  ) {
    throw new Error(
      "Decision basis post-transform proof revision does not match the selected strategy proof.",
    );
  }

  const outputIds =
    selection.status === "selected"
      ? [
          "repair-strategy:selected",
          "repair-strategy:" + selection.selected.strategyId,
          "repair-transaction:" + selection.selected.transactionId,
          ...selection.selected.pipeline.proof.supportingInvariantIds.map(
            (id) => "repair-invariant:" + id,
          ),
          "repair-strategy-class:" +
            selection.selected.intelligence.repairClass,
          "repair-strategy-causal-binding:" +
            (
              selection.selected.intelligence.causalBindingSatisfied
                ? "matched"
                : "unmatched"
            ),
          ...selection.rejectedAlternatives.map(
            (item) =>
              "repair-strategy-rejected:" +
              item.strategyId +
              ":" +
              item.disposition,
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
    basis: {
      ...context.basis,
      ...(selectedPostTransformProofRevision === undefined
        ? {}
        : {
            postTransformProofRevision:
              selectedPostTransformProofRevision,
          }),
    },
    ...(context.upstreamDecisionIds === undefined
      ? {}
      : { upstreamDecisionIds: context.upstreamDecisionIds }),
    inputIds: [
      ...(context.providerProvenance ?? []).map(
        (provider) =>
          "repair-provider:" +
          provider.providerId +
          "@" +
          provider.providerVersion,
      ),
      ...(context.sourceProvenance ?? []).map(
        (source) =>
          "repair-source:" +
          source.sourceKind +
          ":" +
          source.sourceId +
          "@" +
          source.sourceVersion,
      ),
      ...(context.realizerProvenance ?? []).map(
        (realizer) =>
          "repair-realizer:" +
          realizer.realizerId +
          "@" +
          realizer.realizerVersion,
      ),
      ...(selectedPostTransformProofRevision === undefined
        ? []
        : [
            "post-transform-proof:" +
              selectedPostTransformProofRevision,
          ]),
    ],
    outputIds,
    ...(context.evidenceIds === undefined
      ? {}
      : { evidenceIds: context.evidenceIds }),
  });
}


export function recordRealizedRepairStrategySelection(
  ledger: DecisionLedgerSnapshot,
  selection: import("../repair/realized-repair-strategy-selection.js").RealizedRepairStrategySelection,
  transactionId: string | undefined,
  context: DecisionRecordContext,
): DecisionLedgerSnapshot {
  if (selection.result.status !== "evaluated") {
    throw new Error(
      "Realized strategy selection cannot be recorded before invariant derivation passes.",
    );
  }

  if (
    context.basis.repairStrategySourceRegistryRevision !== undefined &&
    context.basis.repairStrategySourceRegistryRevision !==
      selection.sourceRegistryRevision
  ) {
    throw new Error(
      "Decision basis repair strategy source registry revision does not match evaluated source registry.",
    );
  }
  if (
    context.basis.repairRealizerRegistryRevision !== undefined &&
    context.basis.repairRealizerRegistryRevision !==
      selection.realizerRegistryRevision
  ) {
    throw new Error(
      "Decision basis repair realizer registry revision does not match evaluated realizer registry.",
    );
  }

  return recordRepairStrategySelection(
    ledger,
    selection.result.selection,
    transactionId,
    {
      ...context,
      basis: {
        ...context.basis,
        repairStrategySourceRegistryRevision:
          selection.sourceRegistryRevision,
        repairRealizerRegistryRevision:
          selection.realizerRegistryRevision,
      },
      sourceProvenance:
        selection.sourceProvenance,
      realizerProvenance:
        selection.realizerProvenance,
    },
  );
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


export function recordProviderBackedRepairStrategySelection(
  ledger: DecisionLedgerSnapshot,
  selection: ProviderBackedRepairStrategySelection,
  transactionId: string | undefined,
  context: DecisionRecordContext,
): DecisionLedgerSnapshot {
  if (selection.status !== "evaluated") {
    throw new Error(
      "Provider-backed strategy selection cannot be recorded before provider validation passes.",
    );
  }
  if (selection.result.status !== "evaluated") {
    throw new Error(
      "Provider-backed strategy selection cannot be recorded before invariant derivation passes.",
    );
  }

  const providedRealizerRevision =
    context.basis.repairRealizerRegistryRevision;
  if (
    selection.realizerProvenance.length > 0 &&
    !providedRealizerRevision?.trim()
  ) {
    throw new Error(
      "Provider-backed strategy selection with realizer provenance requires repairRealizerRegistryRevision in the decision basis.",
    );
  }

  const providedRevision =
    context.basis.repairProviderRegistryRevision;
  if (
    providedRevision !== undefined &&
    providedRevision !== selection.providerRegistryRevision
  ) {
    throw new Error(
      "Decision basis repair provider registry revision does not match evaluated provider registry.",
    );
  }

  return recordRepairStrategySelection(
    ledger,
    selection.result.selection,
    transactionId,
    {
      ...context,
      basis: {
        ...context.basis,
        repairProviderRegistryRevision:
          selection.providerRegistryRevision,
      },
      providerProvenance: selection.providerProvenance,
      realizerProvenance:
        selection.realizerProvenance.map(
          (item) => ({
            realizerId: item.realizerId,
            realizerVersion: item.realizerVersion,
          }),
        ),
    },
  );
}
