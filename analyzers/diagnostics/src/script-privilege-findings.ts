import { createDiagnostic } from "../../../packages/diagnostics/src/create.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";
import type { ParsedScriptFile } from "../../scripts/src/types.js";

export function scriptExecutionPrivilegeDiagnostics(
  scripts: readonly ParsedScriptFile[],
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];

  for (const script of scripts) {
    for (const mutation of script.restrictedMutations) {
      findings.push(createDiagnostic({
        code: "SCRIPT_RESTRICTED_EXECUTION_MUTATION",
        severity: "medium",
        message:
          `${mutation.method} is used inside ${mutation.root}.beforeEvents.${mutation.event}; known world-state mutations are not permitted in restricted before-event execution.`,
        source: mutation.source,
        data: {
          root: mutation.root,
          event: mutation.event,
          method: mutation.method,
        },
      }));
    }
  }

  return findings;
}
