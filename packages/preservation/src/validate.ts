import type {
  RepairPreservationBaseline,
  RepairPreservationContract,
} from "./types.js";

function duplicate(values: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
}

function nonEmpty(values: readonly string[]): boolean {
  return values.every((value) => typeof value === "string" && value.trim().length > 0);
}

export function validateRepairPreservationContract(
  contract: RepairPreservationContract,
): string[] {
  const errors: string[] = [];

  if (contract.schemaVersion !== 1) {
    errors.push("Preservation contract schemaVersion must be 1.");
  }
  if (!contract.id.trim()) {
    errors.push("Preservation contract id must be non-empty.");
  }
  if (!contract.transactionId.trim()) {
    errors.push("Preservation contract transactionId must be non-empty.");
  }
  if (contract.mustChangeInvariantIds.length === 0) {
    errors.push("Preservation contract requires at least one must-change invariant.");
  }
  if (contract.mustPreserveInvariantIds.length === 0) {
    errors.push("Preservation contract requires at least one must-preserve invariant.");
  }

  for (const [label, values] of [
    ["mustChangeInvariantIds", contract.mustChangeInvariantIds],
    ["mustPreserveInvariantIds", contract.mustPreserveInvariantIds],
    ["allowedSideEffectIds", contract.allowedSideEffectIds ?? []],
    ["forbiddenSideEffectIds", contract.forbiddenSideEffectIds ?? []],
  ] as const) {
    if (!nonEmpty(values)) {
      errors.push(label + " must contain only non-empty strings.");
    }
    const repeated = duplicate(values);
    if (repeated) {
      errors.push(label + " contains duplicate value: " + repeated + ".");
    }
  }

  const preserve = new Set(contract.mustPreserveInvariantIds);
  const overlap = contract.mustChangeInvariantIds.filter((id) => preserve.has(id));
  if (overlap.length > 0) {
    errors.push(
      "An invariant cannot be both must-change and must-preserve: " +
        [...new Set(overlap)].sort().join(", ") +
        ".",
    );
  }

  const allowed = new Set(contract.allowedSideEffectIds ?? []);
  const sideEffectOverlap = (contract.forbiddenSideEffectIds ?? [])
    .filter((id) => allowed.has(id));
  if (sideEffectOverlap.length > 0) {
    errors.push(
      "A side effect cannot be both allowed and forbidden: " +
        [...new Set(sideEffectOverlap)].sort().join(", ") +
        ".",
    );
  }

  return errors;
}

export function validateRepairPreservationBaseline(
  baseline: RepairPreservationBaseline,
): string[] {
  const errors: string[] = [];

  if (baseline.schemaVersion !== 1) {
    errors.push("Preservation baseline schemaVersion must be 1.");
  }
  if (!baseline.contractId.trim()) {
    errors.push("Preservation baseline contractId must be non-empty.");
  }
  if (!baseline.sourceFingerprint.trim()) {
    errors.push("Preservation baseline sourceFingerprint must be non-empty.");
  }

  const ids = baseline.invariantResults.map((result) => result.invariantId);
  const repeated = duplicate(ids);
  if (repeated) {
    errors.push(
      "Preservation baseline contains duplicate invariant result: " +
        repeated +
        ".",
    );
  }

  for (const result of baseline.invariantResults) {
    if (!result.invariantId.trim()) {
      errors.push("Preservation baseline invariantId must be non-empty.");
    }
    if (
      result.state !== "satisfied" &&
      result.state !== "violated" &&
      result.state !== "unknown"
    ) {
      errors.push(
        "Preservation baseline has invalid invariant state for " +
          result.invariantId +
          ".",
      );
    }
    if (
      result.state !== "unknown" &&
      result.evidenceIds.length === 0
    ) {
      errors.push(
        "Preservation baseline proven state requires evidence for " +
          result.invariantId +
          ".",
      );
    }
    if (!nonEmpty(result.evidenceIds)) {
      errors.push(
        "Preservation baseline evidenceIds must contain only non-empty strings for " +
          result.invariantId +
          ".",
      );
    }
  }

  return errors;
}
