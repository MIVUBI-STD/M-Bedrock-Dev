import { patchTransactionId } from "./id.js";
import type {
  PatchTransaction,
  PatchTransactionInput,
} from "./types.js";

export function createPatchTransaction(
  input: PatchTransactionInput,
): PatchTransaction {
  if (
    input.authorization.schemaVersion !== 1 ||
    input.authorization.authorized !== true
  ) {
    throw new Error(
      "Patch transaction requires a valid repair authorization receipt.",
    );
  }
  if (
    input.authorization.evidenceFreshness !==
      "fresh"
  ) {
    throw new Error(
      "Patch transaction authorization evidence must be fresh.",
    );
  }
  if (
    input.authorization.sourceFingerprint !==
      input.sourceFingerprint
  ) {
    throw new Error(
      "Patch transaction source fingerprint does not match its authorization receipt.",
    );
  }
  if (
    input.authorization.diagnosisEvidenceIds.length ===
      0 ||
    input.authorization.invariantIds.length === 0
  ) {
    throw new Error(
      "Patch transaction authorization requires diagnosis evidence and invariant authority.",
    );
  }

  const affectedPaths = [...new Set(
    input.operations.map(
      (operation) =>
        operation.source.relativePath,
    ),
  )].sort();

  const transaction = {
    ...input,
    affectedPaths,
  };

  return {
    ...transaction,
    id: patchTransactionId(transaction),
  };
}
