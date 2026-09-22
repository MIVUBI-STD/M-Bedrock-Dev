import { patchTransactionId } from "./id.js";
import type { PatchTransaction, PatchTransactionInput } from "./types.js";

export function createPatchTransaction(
  input: PatchTransactionInput,
): PatchTransaction {
  const affectedPaths = [...new Set(
    input.operations.map((operation) => operation.source.relativePath),
  )].sort();

  const transaction = {
    ...input,
    affectedPaths,
  };

  return { ...transaction, id: patchTransactionId(transaction) };
}
