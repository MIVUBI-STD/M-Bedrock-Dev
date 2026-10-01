import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../../diagnostics/src/index.js";
import type {
  SpatialAuthorityCoverageReport,
} from "./spatial-authority-analysis.js";

export function spatialAuthorityDiagnostics(
  analysis:
    SpatialAuthorityCoverageReport | undefined,
): DiagnosticFinding[] {
  if (!analysis) return [];

  const strongRisk =
    !analysis.policyValid ||
    analysis.conflicts > 0 ||
    analysis.unknownRegions > 0;

  const reviewRisk =
    analysis.uncovered > 0;

  if (!strongRisk && !reviewRisk) {
    return [];
  }

  return [
    createDiagnostic({
      code: "SPATIAL_AUTHORITY_POLICY_GAP",
      severity: strongRisk
        ? "medium"
        : "minor",
      message:
        "Spatial authority policy coverage is incomplete or conflicting for one or more authored actor/action/region requirements.",
      data: {
        policyId: analysis.policyId,
        policyValid: analysis.policyValid,
        uncovered: analysis.uncovered,
        conflicts: analysis.conflicts,
        unknownRegions: analysis.unknownRegions,
        referencedUnknownRegions:
          analysis.referencedUnknownRegions,
      },
    }),
  ];
}
