import { createDiagnostic } from "../../../packages/diagnostics/src/create.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/types.js";
import type { LinearTopologyOutlier } from "../../topology/src/index.js";
import type { StateAccess } from "../../topology/src/index.js";
import { likelyGlobalAccess } from "../../topology/src/index.js";

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

export function linearTopologyOutlierDiagnostics(
  outliers: readonly LinearTopologyOutlier[],
): DiagnosticFinding[] {
  return outliers.map((outlier) =>
    createDiagnostic({
      code: "TOPOLOGY_TRANSLATION_OUTLIER",
      severity: "medium",
      message: "Repeated spatial effect deviates from a strongly repeated linear translation pattern.",
      data: {
        effectIndex: outlier.effectIndex,
        axis: outlier.axis,
        expectedCoordinate: outlier.expectedCoordinate,
        actualCoordinate: outlier.actualCoordinate,
        step: outlier.step,
        sourcePath: outlier.sourcePath,
      },
    }),
  );
}
