import {
  CONTRACT_REGISTRY_REVISION,
} from "../../project-model/src/contract-registry-revision.js";
import type {
  DecisionBasisRevision,
  DecisionLedgerEntry,
  DecisionLedgerKind,
  DecisionLedgerSnapshot,
} from "../../project-model/src/decision-ledger.js";

export interface AppendDecisionInput {
  id: string;
  kind: DecisionLedgerKind;
  incidentId?: string;
  transactionId?: string;
  basis: DecisionBasisRevision;
  upstreamDecisionIds?: readonly string[];
  inputIds?: readonly string[];
  outputIds?: readonly string[];
  evidenceIds?: readonly string[];
}

function unique(values: readonly string[] | undefined): string[] {
  return [...new Set(values ?? [])].sort();
}

export function createDecisionLedger(): DecisionLedgerSnapshot {
  return {
    schemaVersion: 1,
    entries: [],
  };
}

export function appendDecisionLedgerEntry(
  snapshot: DecisionLedgerSnapshot,
  input: AppendDecisionInput,
): DecisionLedgerSnapshot {
  if (
    input.basis.contractRegistryRevision !== undefined &&
    input.basis.contractRegistryRevision !==
      CONTRACT_REGISTRY_REVISION
  ) {
    throw new Error(
      "Decision basis contract registry revision is stale.",
    );
  }

  if (snapshot.entries.some((entry) => entry.id === input.id)) {
    throw new Error("Decision ledger entry id already exists: " + input.id);
  }

  const upstreamDecisionIds = unique(
    input.upstreamDecisionIds,
  );
  for (const upstreamId of upstreamDecisionIds) {
    const parent = snapshot.entries.find(
      (entry) => entry.id === upstreamId,
    );
    if (!parent) {
      throw new Error(
        "Upstream decision ledger entry does not exist: " +
          upstreamId,
      );
    }
    if (parent.status !== "active") {
      throw new Error(
        "Upstream decision ledger entry is not active: " +
          upstreamId,
      );
    }
  }

  const createdSequence =
    snapshot.entries.reduce(
      (maximum, entry) =>
        Math.max(maximum, entry.createdSequence),
      0,
    ) + 1;

  const entry: DecisionLedgerEntry = {
    id: input.id,
    kind: input.kind,
    status: "active",
    ...(input.incidentId === undefined
      ? {}
      : { incidentId: input.incidentId }),
    ...(input.transactionId === undefined
      ? {}
      : { transactionId: input.transactionId }),
    basis: {
      ...input.basis,
      contractRegistryRevision: CONTRACT_REGISTRY_REVISION,
    },
    upstreamDecisionIds,
    inputIds: unique(input.inputIds),
    outputIds: unique(input.outputIds),
    evidenceIds: unique(input.evidenceIds),
    createdSequence,
  };

  return {
    schemaVersion: 1,
    entries: [...snapshot.entries, entry],
  };
}

function mismatchReason(
  basis: DecisionBasisRevision,
  current: DecisionBasisRevision,
): string | undefined {
  for (const key of [
    "sourceFingerprint",
    "graphFingerprint",
    "contractRegistryRevision",
    "knowledgeRevision",
    "invariantRegistryRevision",
    "targetProfileFingerprint",
    "probeBindingRevision",
    "runtimeEvidenceRevision",
  ] as const) {
    const expected = basis[key];
    if (
      expected !== undefined &&
      current[key] !== expected
    ) {
      return (
        key +
        " changed from " +
        expected +
        " to " +
        String(current[key] ?? "<missing>") +
        "."
      );
    }
  }
  return undefined;
}

export function invalidateStaleDecisionLedger(
  snapshot: DecisionLedgerSnapshot,
  currentBasis: DecisionBasisRevision,
): DecisionLedgerSnapshot {
  let entries = snapshot.entries.map((entry) => {
    if (entry.status !== "active") return entry;
    const reason = mismatchReason(
      entry.basis,
      currentBasis,
    );
    if (!reason) return entry;
    return {
      ...entry,
      status: "invalidated" as const,
      invalidationReason: reason,
    };
  });

  let changed = true;
  while (changed) {
    changed = false;
    const byId = new Map(
      entries.map((entry) => [entry.id, entry]),
    );

    entries = entries.map((entry) => {
      if (entry.status !== "active") return entry;

      const invalidParent = entry.upstreamDecisionIds
        .map((id) => byId.get(id))
        .find(
          (parent) =>
            parent === undefined ||
            parent.status !== "active",
        );

      if (!invalidParent && entry.upstreamDecisionIds.every((id) => byId.has(id))) {
        return entry;
      }

      changed = true;
      return {
        ...entry,
        status: "invalidated" as const,
        invalidationReason:
          invalidParent === undefined
            ? "Upstream decision is missing."
            : "Upstream decision is no longer active: " +
              invalidParent.id +
              ".",
      };
    });
  }

  return {
    schemaVersion: 1,
    entries,
  };
}

export function supersedeDecisionLedgerEntry(
  snapshot: DecisionLedgerSnapshot,
  entryId: string,
  supersededBy: string,
): DecisionLedgerSnapshot {
  const replacement = snapshot.entries.find(
    (entry) => entry.id === supersededBy,
  );
  if (!replacement) {
    throw new Error(
      "Superseding decision ledger entry does not exist: " +
        supersededBy,
    );
  }

  const original = snapshot.entries.find(
    (entry) => entry.id === entryId,
  );
  if (
    original &&
    replacement.createdSequence <= original.createdSequence
  ) {
    throw new Error(
      "Superseding decision must be newer than the decision it replaces.",
    );
  }

  let found = false;
  const entries = snapshot.entries.map((entry) => {
    if (entry.id !== entryId) return entry;
    found = true;
    if (entry.status !== "active") {
      throw new Error(
        "Only active decision ledger entries can be superseded.",
      );
    }
    return {
      ...entry,
      status: "superseded" as const,
      supersededBy,
    };
  });

  if (!found) {
    throw new Error(
      "Decision ledger entry does not exist: " + entryId,
    );
  }

  return {
    schemaVersion: 1,
    entries,
  };
}

export function activeDecisionLedgerEntries(
  snapshot: DecisionLedgerSnapshot,
): readonly DecisionLedgerEntry[] {
  return snapshot.entries.filter(
    (entry) => entry.status === "active",
  );
}
