import { patchTransactionId } from "./id.js";
import type { PatchTransaction } from "./types.js";

export function createPatchTransaction(
  transaction: Omit<PatchTransaction, "id">,
): PatchTransaction {
  return { ...transaction, id: patchTransactionId(transaction) };
}
