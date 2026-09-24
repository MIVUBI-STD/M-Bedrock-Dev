import type {
  DecisionBasisRevision,
  DecisionLedgerEntry,
  DecisionLedgerKind,
  DecisionLedgerSnapshot,
} from "../../project-model/src/decision-ledger.js";
import {
  validateDecisionLedgerSnapshot,
} from "../../project-model/src/decision-ledger-validate.js";
import type { RepairLifecycleState } from "./repair-lifecycle.js";
import type { RepairProofBundle } from "./repair-proof-bundle.js";
import {
  invalidateStaleDecisionLedger,
} from "./decision-ledger.js";
import {
  decideRepairRelease,
  type RepairReleaseDecision,
} from "./repair-release-gate.js";

export interface RepairReleaseLineageResult {
  decision: RepairReleaseDecision;
  ledger: DecisionLedgerSnapshot;
  lineageDecisionIds: readonly string[];
  reasons: readonly string[];
}

function activeForTransaction(
  ledger: DecisionLedgerSnapshot,
  transactionId: string,
  kind: DecisionLedgerKind,
): DecisionLedgerEntry[] {
  return ledger.entries.filter(
    (entry) =>
      entry.status === "active" &&
      entry.transactionId === transactionId &&
      entry.kind === kind,
  );
}

function ancestorIds(
  ledger: DecisionLedgerSnapshot,
  entry: DecisionLedgerEntry,
): Set<string> {
  const byId = new Map(
    ledger.entries.map((item) => [item.id, item]),
  );
  const output = new Set<string>();
  const queue = [...entry.upstreamDecisionIds];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (output.has(id)) continue;
    output.add(id);
    const parent = byId.get(id);
    if (!parent) continue;
    queue.push(...parent.upstreamDecisionIds);
  }

  return output;
}

function activeAncestorsOfKind(
  ledger: DecisionLedgerSnapshot,
  entry: DecisionLedgerEntry,
  kind: DecisionLedgerKind,
): DecisionLedgerEntry[] {
  const byId = new Map(
    ledger.entries.map((item) => [item.id, item]),
  );

  return [...ancestorIds(ledger, entry)]
    .map((id) => byId.get(id))
    .filter(
      (ancestor): ancestor is DecisionLedgerEntry =>
        ancestor !== undefined &&
        ancestor.status === "active" &&
        ancestor.kind === kind,
    );
}

function uniqueActiveStage(
  ledger: DecisionLedgerSnapshot,
  transactionId: string,
  kind: DecisionLedgerKind,
): {
  entry?: DecisionLedgerEntry;
  error?: string;
} {
  const entries = activeForTransaction(
    ledger,
    transactionId,
    kind,
  );

  if (entries.length === 0) {
    return {
      error:
        "Missing active " +
        kind +
        " decision for transaction " +
        transactionId +
        ".",
    };
  }

  if (entries.length > 1) {
    return {
      error:
        "Multiple active " +
        kind +
        " decisions make release lineage ambiguous for transaction " +
        transactionId +
        ".",
    };
  }

  return { entry: entries[0]! };
}

function proofBasisMismatch(
  proof: RepairProofBundle,
  currentBasis: DecisionBasisRevision,
): string | undefined {
  for (const key of [
    "sourceFingerprint",
    "graphFingerprint",
    "knowledgeRevision",
    "invariantRegistryRevision",
    "targetProfileFingerprint",
    "probeBindingRevision",
  ] as const) {
    const expected = proof.decisionBasis[key];
    if (
      expected !== undefined &&
      currentBasis[key] !== expected
    ) {
      return (
        key +
        " changed from " +
        expected +
        " to " +
        String(currentBasis[key] ?? "<missing>") +
        "."
      );
    }
  }
  return undefined;
}

export function decideRepairReleaseWithLineage(
  lifecycle: RepairLifecycleState,
  proof: RepairProofBundle,
  ledgerSnapshot: DecisionLedgerSnapshot,
  currentBasis: DecisionBasisRevision,
): RepairReleaseLineageResult {
  const lifecycleDecision = decideRepairRelease(lifecycle);

  if (proof.transactionId !== lifecycle.transactionId) {
    return {
      decision: {
        transactionId: lifecycle.transactionId,
        disposition: "blocked",
        reasons: [
          "Repair proof does not belong to the lifecycle transaction.",
        ],
      },
      ledger: ledgerSnapshot,
      lineageDecisionIds: [],
      reasons: [
        "Repair proof transactionId does not match lifecycle transactionId.",
      ],
    };
  }

  const basisMismatch = proofBasisMismatch(
    proof,
    currentBasis,
  );
  if (basisMismatch) {
    return {
      decision: {
        transactionId: lifecycle.transactionId,
        disposition: "blocked",
        reasons: [
          "Repair proof decision basis is stale.",
          basisMismatch,
        ],
      },
      ledger: ledgerSnapshot,
      lineageDecisionIds: [],
      reasons: [basisMismatch],
    };
  }

  const ledgerErrors = validateDecisionLedgerSnapshot(
    ledgerSnapshot,
  );
  if (ledgerErrors.length > 0) {
    return {
      decision: {
        transactionId: lifecycle.transactionId,
        disposition: "blocked",
        reasons: [
          "Decision ledger is structurally invalid.",
          ...ledgerErrors,
        ],
      },
      ledger: ledgerSnapshot,
      lineageDecisionIds: [],
      reasons: ledgerErrors,
    };
  }

  const ledger = invalidateStaleDecisionLedger(
    ledgerSnapshot,
    currentBasis,
  );

  if (lifecycleDecision.disposition !== "release-eligible") {
    return {
      decision: lifecycleDecision,
      ledger,
      lineageDecisionIds: [],
      reasons: lifecycleDecision.reasons,
    };
  }

  const transactionId = lifecycle.transactionId;
  const strategy = uniqueActiveStage(
    ledger,
    transactionId,
    "repair-strategy-selection",
  );
  const admission = uniqueActiveStage(
    ledger,
    transactionId,
    "repair-admission",
  );
  const runtime = uniqueActiveStage(
    ledger,
    transactionId,
    "runtime-verification",
  );
  const packageVerification = uniqueActiveStage(
    ledger,
    transactionId,
    "package-verification",
  );

  const needsTransitiveRevalidation =
    proof.requiredRevalidationNodeIds.length > 0 ||
    proof.requiredRevalidationPaths.length > 0;

  const transitive = needsTransitiveRevalidation
    ? uniqueActiveStage(
        ledger,
        transactionId,
        "transitive-revalidation",
      )
    : {};

  const stageErrors = [
    strategy.error,
    admission.error,
    ...(needsTransitiveRevalidation
      ? [transitive.error]
      : []),
    runtime.error,
    packageVerification.error,
  ].filter((value): value is string => value !== undefined);

  if (stageErrors.length > 0) {
    return {
      decision: {
        transactionId,
        disposition: "blocked",
        reasons: [
          "Repair lifecycle is complete, but decision lineage is incomplete or ambiguous.",
          ...stageErrors,
        ],
      },
      ledger,
      lineageDecisionIds: [],
      reasons: stageErrors,
    };
  }

  const strategyEntry = strategy.entry!;
  const admissionEntry = admission.entry!;
  const runtimeEntry = runtime.entry!;
  const packageEntry = packageVerification.entry!;
  const transitiveEntry = needsTransitiveRevalidation
    ? transitive.entry!
    : undefined;

  const authorizationEntries = activeAncestorsOfKind(
    ledger,
    strategyEntry,
    "repair-authorization",
  );

  const lineageErrors: string[] = [];

  if (authorizationEntries.length !== 1) {
    lineageErrors.push(
      authorizationEntries.length === 0
        ? "Repair strategy selection is not descended from an active repair authorization."
        : "Repair strategy selection has multiple active repair authorization ancestors.",
    );
  }

  if (
    proof.selectedCandidateId !== undefined &&
    !authorizationEntries.some((entry) =>
      entry.outputIds.includes(
        "root-cause:" + proof.selectedCandidateId,
      )
    )
  ) {
    lineageErrors.push(
      "Repair authorization lineage does not prove the root cause selected by the repair proof.",
    );
  }

  const admissionAncestors = ancestorIds(
    ledger,
    admissionEntry,
  );
  if (!admissionAncestors.has(strategyEntry.id)) {
    lineageErrors.push(
      "Repair admission is not descended from the selected repair strategy.",
    );
  }

  if (
    !strategyEntry.outputIds.includes(
      "repair-strategy:selected",
    )
  ) {
    lineageErrors.push(
      "Active repair strategy decision does not record a selected strategy.",
    );
  }

  if (
    !strategyEntry.outputIds.includes(
      "repair-transaction:" + transactionId,
    )
  ) {
    lineageErrors.push(
      "Active repair strategy decision does not bind the selected strategy to this transaction.",
    );
  }

  for (const invariantId of proof.supportingInvariantIds) {
    if (
      !strategyEntry.outputIds.includes(
        "repair-invariant:" + invariantId,
      )
    ) {
      lineageErrors.push(
        "Repair strategy lineage does not carry supporting invariant: " +
          invariantId +
          ".",
      );
    }
  }

  if (transitiveEntry) {
    const transitiveAncestors = ancestorIds(
      ledger,
      transitiveEntry,
    );
    if (!transitiveAncestors.has(admissionEntry.id)) {
      lineageErrors.push(
        "Transitive revalidation is not descended from repair admission.",
      );
    }

    if (
      !transitiveEntry.outputIds.includes(
        "transitive-revalidation:passed",
      )
    ) {
      lineageErrors.push(
        "Active transitive revalidation decision is not a passing decision.",
      );
    }

    for (const nodeId of proof.requiredRevalidationNodeIds) {
      if (
        !transitiveEntry.inputIds.includes(
          "revalidation-node:" + nodeId,
        )
      ) {
        lineageErrors.push(
          "Transitive revalidation lineage does not cover required node: " +
            nodeId +
            ".",
        );
      }
    }

    for (const revalidationPath of proof.requiredRevalidationPaths) {
      if (
        !transitiveEntry.inputIds.includes(
          "revalidation-path:" + revalidationPath,
        )
      ) {
        lineageErrors.push(
          "Transitive revalidation lineage does not cover required path: " +
            revalidationPath +
            ".",
        );
      }
    }
  }

  const requiredVerificationParent =
    transitiveEntry?.id ?? admissionEntry.id;

  const runtimeAncestors = ancestorIds(
    ledger,
    runtimeEntry,
  );
  if (!runtimeAncestors.has(requiredVerificationParent)) {
    lineageErrors.push(
      "Runtime verification is not descended from " +
        (transitiveEntry
          ? "transitive revalidation."
          : "repair admission."),
    );
  }

  const packageAncestors = ancestorIds(
    ledger,
    packageEntry,
  );
  if (!packageAncestors.has(requiredVerificationParent)) {
    lineageErrors.push(
      "Package verification is not descended from " +
        (transitiveEntry
          ? "transitive revalidation."
          : "repair admission."),
    );
  }

  const expectedAdmission =
    proof.admissionDisposition === "guarded"
      ? "repair-admission:guarded"
      : "repair-admission:eligible";

  if (
    !admissionEntry.outputIds.includes(expectedAdmission)
  ) {
    lineageErrors.push(
      "Repair admission lineage does not match proof admission disposition.",
    );
  }

  if (
    !runtimeEntry.outputIds.includes(
      "runtime-verification:passed",
    )
  ) {
    lineageErrors.push(
      "Active runtime verification decision is not a passing decision.",
    );
  }

  if (
    !packageEntry.outputIds.includes(
      "package-verification:passed",
    )
  ) {
    lineageErrors.push(
      "Active package verification decision is not a passing decision.",
    );
  }

  const lineageDecisionIds = [
    ...authorizationEntries.map((entry) => entry.id),
    strategyEntry.id,
    admissionEntry.id,
    ...(transitiveEntry ? [transitiveEntry.id] : []),
    runtimeEntry.id,
    packageEntry.id,
  ].sort();

  if (lineageErrors.length > 0) {
    return {
      decision: {
        transactionId,
        disposition: "blocked",
        reasons: [
          "Repair lifecycle proof exists, but active decision lineage is not release-safe.",
          ...lineageErrors,
        ],
      },
      ledger,
      lineageDecisionIds,
      reasons: lineageErrors,
    };
  }

  return {
    decision: {
      transactionId,
      disposition: "release-eligible",
      reasons: [
        ...lifecycleDecision.reasons,
        "Active decision lineage is complete, current, causally authorized, invariant-bound, and verified through runtime/package evidence.",
      ],
    },
    ledger,
    lineageDecisionIds,
    reasons: [],
  };
}
