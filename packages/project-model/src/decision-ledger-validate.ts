import type {
  DecisionLedgerEntry,
  DecisionLedgerKind,
  DecisionLedgerSnapshot,
  DecisionLedgerStatus,
} from "./decision-ledger.js";

const KINDS = new Set<DecisionLedgerKind>([
  "diagnostic-candidate-selection",
  "repair-authorization",
  "repair-admission",
  "repair-strategy-selection",
  "transitive-revalidation",
  "runtime-verification",
  "preservation-verification",
  "package-verification",
  "release-admission",
]);

const STATUSES = new Set<DecisionLedgerStatus>([
  "active",
  "superseded",
  "invalidated",
]);

const BASIS_FIELDS = new Set([
  "sourceFingerprint",
  "graphFingerprint",
  "semanticIrRevision",
  "contractRegistryRevision",
  "knowledgeRevision",
  "invariantRegistryRevision",
  "repairProviderRegistryRevision",
  "targetProfileFingerprint",
  "probeBindingRevision",
  "runtimeEvidenceRevision",
  "preservationContractRevision",
  "preservationBaselineRevision",
]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(nonEmpty);
}

function duplicate(values: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
}

function validateDecisionBasis(
  value: Record<string, unknown>,
  index: number,
): string[] {
  const errors: string[] = [];
  for (const [key, revision] of Object.entries(value)) {
    if (!BASIS_FIELDS.has(key)) {
      errors.push(
        "entries[" + index + "].basis has unknown field " + key + ".",
      );
      continue;
    }
    if (!nonEmpty(revision)) {
      errors.push(
        "entries[" + index + "].basis." + key +
          " must be a non-empty string when present.",
      );
    }
  }
  return errors;
}

function validateEntrySemantics(
  value: Record<string, unknown>,
  index: number,
): string[] {
  const errors: string[] = [];
  if (!record(value.basis)) return errors;

  const inputIds = stringArray(value.inputIds)
    ? value.inputIds
    : [];
  const outputIds = stringArray(value.outputIds)
    ? value.outputIds
    : [];

  const providerBound = inputIds.some((id) =>
    id.startsWith("repair-provider:")
  );
  if (
    providerBound &&
    !nonEmpty(value.basis.repairProviderRegistryRevision)
  ) {
    errors.push(
      "entries[" + index +
        "] provider-bound decision requires repairProviderRegistryRevision.",
    );
  }

  if (
    value.kind === "repair-strategy-selection" &&
    nonEmpty(value.basis.repairProviderRegistryRevision) &&
    !providerBound
  ) {
    errors.push(
      "entries[" + index +
        "] provider-bound repair strategy requires repair-provider provenance.",
    );
  }

  const invariantBound = outputIds.some((id) =>
    id.startsWith("repair-invariant:")
  );
  if (
    invariantBound &&
    !nonEmpty(value.basis.invariantRegistryRevision)
  ) {
    errors.push(
      "entries[" + index +
        "] invariant-bound decision requires invariantRegistryRevision.",
    );
  }

  if (
    (value.kind === "runtime-verification" ||
      value.kind === "preservation-verification") &&
    !nonEmpty(value.basis.runtimeEvidenceRevision)
  ) {
    errors.push(
      "entries[" + index +
        "] runtime/preservation verification requires runtimeEvidenceRevision.",
    );
  }

  if (
    value.kind === "preservation-verification" &&
    (
      !nonEmpty(value.basis.preservationContractRevision) ||
      !nonEmpty(value.basis.preservationBaselineRevision)
    )
  ) {
    errors.push(
      "entries[" + index +
        "] preservation-verification requires preservation contract and baseline revisions.",
    );
  }

  if (
    value.kind === "release-admission" &&
    !nonEmpty(value.basis.runtimeEvidenceRevision)
  ) {
    errors.push(
      "entries[" + index +
        "] release-admission requires runtimeEvidenceRevision.",
    );
  }

  if (
    value.kind === "release-admission" &&
    (
      !nonEmpty(value.basis.preservationContractRevision) ||
      !nonEmpty(value.basis.preservationBaselineRevision)
    )
  ) {
    errors.push(
      "entries[" + index +
        "] release-admission requires preservation contract and baseline revisions.",
    );
  }

  return errors;
}

function validateEntryShape(
  value: unknown,
  index: number,
): string[] {
  const errors: string[] = [];
  if (!record(value)) {
    return ["entries[" + index + "] must be an object."];
  }

  if (!nonEmpty(value.id)) {
    errors.push("entries[" + index + "].id must be non-empty.");
  }
  if (!KINDS.has(value.kind as DecisionLedgerKind)) {
    errors.push("entries[" + index + "].kind is invalid.");
  }
  if (!STATUSES.has(value.status as DecisionLedgerStatus)) {
    errors.push("entries[" + index + "].status is invalid.");
  }
  if (
    !Number.isInteger(value.createdSequence) ||
    (value.createdSequence as number) < 1
  ) {
    errors.push(
      "entries[" + index + "].createdSequence must be a positive integer.",
    );
  }
  if (!record(value.basis)) {
    errors.push("entries[" + index + "].basis must be an object.");
  } else {
    errors.push(...validateDecisionBasis(value.basis, index));
  }

  for (const field of [
    "upstreamDecisionIds",
    "inputIds",
    "outputIds",
    "evidenceIds",
  ] as const) {
    if (!stringArray(value[field])) {
      errors.push(
        "entries[" + index + "]." + field +
          " must be an array of non-empty strings.",
      );
      continue;
    }
    const repeated = duplicate(value[field]);
    if (repeated) {
      errors.push(
        "entries[" + index + "]." + field +
          " contains duplicate value " + repeated + ".",
      );
    }
  }

  errors.push(...validateEntrySemantics(value, index));

  if (
    value.status === "invalidated" &&
    !nonEmpty(value.invalidationReason)
  ) {
    errors.push(
      "entries[" + index + "] invalidated entry requires invalidationReason.",
    );
  }
  if (
    value.status === "superseded" &&
    !nonEmpty(value.supersededBy)
  ) {
    errors.push(
      "entries[" + index + "] superseded entry requires supersededBy.",
    );
  }
  if (
    value.status === "active" &&
    (
      value.invalidationReason !== undefined ||
      value.supersededBy !== undefined
    )
  ) {
    errors.push(
      "entries[" + index + "] active entry cannot carry invalidation/supersession metadata.",
    );
  }

  return errors;
}

export function validateDecisionLedgerSnapshot(
  input: unknown,
): string[] {
  if (!record(input)) {
    return ["Decision ledger snapshot must be an object."];
  }
  if (input.schemaVersion !== 1) {
    return ["Decision ledger schemaVersion must be 1."];
  }
  if (!Array.isArray(input.entries)) {
    return ["Decision ledger entries must be an array."];
  }

  const errors = input.entries.flatMap(
    (entry, index) => validateEntryShape(entry, index),
  );

  // Ledger identity is a global invariant and should still be reported when
  // an entry also has a local lineage-shape defect.
  const seenIds = new Set<string>();
  for (const entry of input.entries) {
    if (!record(entry) || !nonEmpty(entry.id)) continue;
    if (seenIds.has(entry.id)) {
      errors.push("Duplicate decision ledger id: " + entry.id + ".");
    }
    seenIds.add(entry.id);
  }

  if (errors.length > 0) return errors;

  const entries = input.entries as unknown as DecisionLedgerEntry[];
  const byId = new Map<string, DecisionLedgerEntry>();
  let previousSequence = 0;

  for (const [index, entry] of entries.entries()) {
    if (entry.createdSequence <= previousSequence) {
      errors.push(
        "entries[" + index + "] createdSequence must be strictly increasing.",
      );
    }
    previousSequence = entry.createdSequence;
    byId.set(entry.id, entry);
  }

  for (const entry of entries) {
    for (const parentId of entry.upstreamDecisionIds) {
      const parent = byId.get(parentId);
      if (!parent) {
        errors.push(
          "Decision " + entry.id +
            " references missing upstream decision " +
            parentId + ".",
        );
        continue;
      }
      if (parent.createdSequence >= entry.createdSequence) {
        errors.push(
          "Decision " + entry.id +
            " upstream decision " + parentId +
            " must be older.",
        );
      }
      if (entry.status === "active" && parent.status !== "active") {
        errors.push(
          "Active decision " + entry.id +
            " depends on non-active upstream decision " +
            parentId + ".",
        );
      }
    }

    if (entry.status === "superseded" && entry.supersededBy) {
      const replacement = byId.get(entry.supersededBy);
      if (!replacement) {
        errors.push(
          "Decision " + entry.id +
            " references missing superseding decision " +
            entry.supersededBy + ".",
        );
      } else if (
        replacement.createdSequence <= entry.createdSequence
      ) {
        errors.push(
          "Decision " + entry.id +
            " must be superseded by a newer decision.",
        );
      }
    }
  }

  return errors;
}

export function parseDecisionLedgerSnapshot(
  input: unknown,
): DecisionLedgerSnapshot {
  const errors = validateDecisionLedgerSnapshot(input);
  if (errors.length > 0) {
    throw new Error(
      "Invalid decision ledger snapshot: " + errors.join("; "),
    );
  }
  return input as DecisionLedgerSnapshot;
}
