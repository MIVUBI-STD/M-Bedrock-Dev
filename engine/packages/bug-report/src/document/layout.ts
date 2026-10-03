import type {
  BugReportClientDocument,
} from "./model.js";

export interface BugReportClientLayoutPlan {
  readonly showIssueIndex: boolean;
  readonly showSeverityLegend: boolean;
  readonly compactTables: boolean;
}

/**
 * Reader-facing layout decisions for Word/PDF.
 *
 * Default HTML uses one compact expandable row per bug.
 * Retest state belongs directly to each bug row, so a separate issue index is
 * intentionally not rendered.
 */
export function buildBugReportClientLayoutPlan(
  document: BugReportClientDocument,
): BugReportClientLayoutPlan {
  const count = document.issues.length;

  return {
    showIssueIndex: false,
    showSeverityLegend: count > 0,
    compactTables: count >= 4,
  };
}
