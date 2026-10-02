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
 * Default documents are table-first and intentionally compact.
 * A separate issue index is used only when the report is large
 * enough that scanning the full issue tables becomes slower.
 */
export function buildBugReportClientLayoutPlan(
  document: BugReportClientDocument,
): BugReportClientLayoutPlan {
  const count = document.issues.length;

  return {
    showIssueIndex: count >= 3,
    showSeverityLegend: count > 0,
    compactTables: count >= 4,
  };
}
