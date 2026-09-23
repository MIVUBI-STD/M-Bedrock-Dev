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
        severity: mutation.evidence === "exact-symbol" ? "medium" : "minor",
        message:
          mutation.context === "custom-command"
            ? `${mutation.symbol} is used inside a custom command callback; custom command callbacks run in restricted execution and Microsoft documents this operation as unavailable there.`
            : `${mutation.symbol} is used inside ${mutation.root}.beforeEvents.${mutation.event}; Microsoft documents this operation as unavailable in restricted-execution mode.`,
        source: mutation.source,
        data: {
          root: mutation.root,
          context: mutation.context,
          event: mutation.event,
          method: mutation.method,
          symbol: mutation.symbol,
          operation: mutation.operation,
          evidence: mutation.evidence,
          ruleId: mutation.ruleId,
        },
      }));
    }
  }

  return findings;
}
