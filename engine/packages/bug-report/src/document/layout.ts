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
 * The issue index is the tester's retest checklist, so it is shown whenever
 * at least one visible bug exists.
 */
export function buildBugReportClientLayoutPlan(
  document: BugReportClientDocument,
): BugReportClientLayoutPlan {
  const count = document.issues.length;

  return {
    showIssueIndex: count > 0,
    showSeverityLegend: count > 0,
    compactTables: count >= 4,
  };
}
