import type {
  BugReportClientDocument,
} from "./model.js";

export interface BugReportClientLayoutPlan {
  readonly showSeverityLegend: boolean;
}

/**
 * Reader-facing layout decisions for the self-contained HTML report.
 * Each bug owns its own compact expandable row; no parallel index/table lane.
 */
export function buildBugReportClientLayoutPlan(
  document: BugReportClientDocument,
): BugReportClientLayoutPlan {
  return {
    showSeverityLegend:
      document.issues.length > 0,
  };
}
