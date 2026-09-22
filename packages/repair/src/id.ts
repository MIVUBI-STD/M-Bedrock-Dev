import { createHash } from "node:crypto";
import type { PatchTransaction } from "./types.js";

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
