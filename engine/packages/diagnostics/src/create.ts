import { diagnosticId } from "./id.js";
import type { DiagnosticFinding } from "./types.js";

export function createDiagnostic(
  finding: Omit<DiagnosticFinding, "id">,
): DiagnosticFinding {
  return { ...finding, id: diagnosticId(finding) };
}
