import { createDiagnostic } from "../../../packages/diagnostics/src/index.js";
import type { DiagnosticFinding } from "../../../packages/diagnostics/src/index.js";
import type { ExpectedTranslation } from "../../topology/src/index.js";

export function topologyOutlierDiagnostics(
  comparisons: readonly ExpectedTranslation[],
): DiagnosticFinding[] {
  return comparisons
    .filter((comparison) => comparison.status === "outlier")
    .map((comparison) =>
      createDiagnostic({
        code: "TOPOLOGY_TRANSLATION_OUTLIER",
        severity: "medium",
        message: "Translated effect does not match the expected topology offset.",
        data: {
          sourceIndex: comparison.sourceIndex,
          targetIndex: comparison.targetIndex,
          expected: comparison.expected,
          actual: comparison.actual,
        },
      }),
    );
}
