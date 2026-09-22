import { createHash } from "node:crypto";
import type { DiagnosticFinding } from "./types.js";

export function diagnosticId(
  finding: Omit<DiagnosticFinding, "id">,
): string {
  const payload = JSON.stringify({
    code: finding.code,
    message: finding.message,
    source: finding.source ?? null,
    relatedNodeIds: finding.relatedNodeIds ?? [],
    data: finding.data ?? null,
  });

  return `diag_${createHash("sha256").update(payload).digest("hex").slice(0, 20)}`;
}
