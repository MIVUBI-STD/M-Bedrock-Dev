import { createDiagnostic } from "../../../packages/diagnostics/src/create.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";
import type { SourceRef } from "../../../packages/project-model/src/source-ref.js";

export interface CommandChainDiagnosticInput {
  kind:
    | "missing-facing-direction"
    | "conditional-without-predecessor"
    | "chain-without-predecessor";
  flatIndex: number;
}

export function commandChainDiagnostics(
  issues: readonly CommandChainDiagnosticInput[],
  source: SourceRef,
): DiagnosticFinding[] {
  return issues.map((issue) => createDiagnostic({
    code: "STRUCTURE_COMMAND_CHAIN_TOPOLOGY_RISK",
    severity: issue.kind === "conditional-without-predecessor"
      ? "medium"
      : "info",
    message: issue.kind === "conditional-without-predecessor"
      ? "Conditional chain command block has no detected predecessor in local structure topology."
      : issue.kind === "chain-without-predecessor"
        ? "Chain command block has no detected predecessor in local structure topology."
        : "Command block facing direction could not be derived from structure palette state.",
    source,
    data: { kind: issue.kind, flatIndex: issue.flatIndex },
  }));
}
