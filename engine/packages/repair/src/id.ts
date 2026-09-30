import { createHash } from "node:crypto";
import type { PatchTransaction } from "./types.js";

export function patchTransactionSemanticFingerprint(
  transaction: Omit<PatchTransaction, "id"> | PatchTransaction,
): string {
  const payload = JSON.stringify({
    sourceFingerprint: transaction.sourceFingerprint,
    requiredProofs: [...(transaction.requiredProofs ?? [])].sort(),
    operations: transaction.operations,
    preconditions: transaction.preconditions,
    validation: transaction.validation,
    affectedPaths: [...transaction.affectedPaths].sort(),
  });

  return createHash("sha256")
    .update(payload)
    .digest("hex");
}

export function patchTransactionId(
  transaction: Omit<PatchTransaction, "id">,
): string {
  const payload = JSON.stringify({
    title: transaction.title,
    sourceFingerprint: transaction.sourceFingerprint,
    operations: transaction.operations,
    preconditions: transaction.preconditions,
    validation: transaction.validation,
    affectedPaths: [...transaction.affectedPaths].sort(),
  });

  return `patch_${createHash("sha256").update(payload).digest("hex").slice(0, 20)}`;
}
