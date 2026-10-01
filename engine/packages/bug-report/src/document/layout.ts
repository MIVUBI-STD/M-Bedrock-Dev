import type {
  BugReportClientDocument,
} from "./model.js";

export interface BugReportClientLayoutPlan {
  readonly showIssueIndex: boolean;
  readonly showSeverityGuide: boolean;
  readonly pageBreakBeforeIssueDetails: boolean;
  readonly issueDetailDensity:
    | "compact"
    | "standard";
}

/**
 * Reader-facing layout decisions derived only from visible document density.
 *
 * Renderers consume this plan; they do not invent their own thresholds.
 */
export function buildBugReportClientLayoutPlan(
  document: BugReportClientDocument,
): BugReportClientLayoutPlan {
  const count = document.issues.length;

  return {
    showIssueIndex: count >= 2,
    showSeverityGuide: count > 0,
    pageBreakBeforeIssueDetails:
      count >= 4,
    issueDetailDensity:
      count >= 8
        ? "compact"
        : "standard",
  };
}
