import { createDiagnostic } from "../../../packages/diagnostics/src/create.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";
import type { StateAccess } from "../../topology/src/state-scope.js";
import { likelyGlobalAccess } from "../../topology/src/state-scope.js";

export function stateScopeDiagnostics(accesses: readonly StateAccess[]): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  for (const access of accesses) {
    if (access.access === "write" && likelyGlobalAccess(access)) {
      findings.push(createDiagnostic({
        code: "CROSS_SCOPE_STATE_RISK",
        severity: "medium",
        message: `${access.stateKind} write to ${access.key} uses broad selector ${access.selector}.`,
        data: {
          stateKind: access.stateKind,
          key: access.key,
          selector: access.selector,
          selectorScope: access.selectorScope,
        },
      }));
    }
  }
  return findings;
}
