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

function hasAncestorKind(
  ledger: DecisionLedgerSnapshot,
  entry: DecisionLedgerEntry,
  kind: DecisionLedgerKind,
): boolean {
  const byId = new Map(
    ledger.entries.map((item) => [item.id, item]),
  );
  for (const id of ancestorIds(ledger, entry)) {
    const ancestor = byId.get(id);
    if (
      ancestor?.status === "active" &&
      ancestor.kind === kind
    ) {
      return true;
    }
  }
  return false;
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

export function decideRepairReleaseWithLineage(
  lifecycle: RepairLifecycleState,
  ledgerSnapshot: DecisionLedgerSnapshot,
  currentBasis: DecisionBasisRevision,
): RepairReleaseLineageResult {
  const lifecycleDecision = decideRepairRelease(lifecycle);
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

  const stageErrors = [
    strategy.error,
    admission.error,
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

  const lineageErrors: string[] = [];

  if (
    !hasAncestorKind(
      ledger,
      strategyEntry,
      "repair-authorization",
    )
  ) {
    lineageErrors.push(
      "Repair strategy selection is not descended from an active repair authorization.",
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

  const runtimeAncestors = ancestorIds(
    ledger,
    runtimeEntry,
  );
  if (!runtimeAncestors.has(admissionEntry.id)) {
    lineageErrors.push(
      "Runtime verification is not descended from repair admission.",
    );
  }

  const packageAncestors = ancestorIds(
    ledger,
    packageEntry,
  );
  if (!packageAncestors.has(admissionEntry.id)) {
    lineageErrors.push(
      "Package verification is not descended from repair admission.",
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
    !admissionEntry.outputIds.includes(
      "repair-admission:eligible",
    ) &&
    !admissionEntry.outputIds.includes(
      "repair-admission:guarded",
    )
  ) {
    lineageErrors.push(
      "Active repair admission decision does not authorize mutation.",
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
      lineageDecisionIds: [
        strategyEntry.id,
        admissionEntry.id,
        runtimeEntry.id,
        packageEntry.id,
      ].sort(),
      reasons: lineageErrors,
    };
  }

  const authorizationIds = [...ancestorIds(
    ledger,
    strategyEntry,
  )]
    .map((id) => ledger.entries.find((entry) => entry.id === id))
    .filter(
      (entry): entry is DecisionLedgerEntry =>
        entry !== undefined &&
        entry.status === "active" &&
        entry.kind === "repair-authorization",
    )
    .map((entry) => entry.id);

  return {
    decision: {
      transactionId,
      disposition: "release-eligible",
      reasons: [
        ...lifecycleDecision.reasons,
        "Active decision lineage proves repair authorization, strategy selection, admission, runtime verification, and package verification.",
      ],
    },
    ledger,
    lineageDecisionIds: [
      ...authorizationIds,
      strategyEntry.id,
      admissionEntry.id,
      runtimeEntry.id,
      packageEntry.id,
    ].sort(),
    reasons: [],
  };
}
