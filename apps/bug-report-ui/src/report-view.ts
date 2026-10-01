import {
  compareBugReportPreviewOrder,
  type BugReportV2,
  type BugReportV2Bug,
} from "../../../engine/packages/bug-report/src/index.js";

export type BugReportView = "all" | "not-fixed" | "fixed";
export type BugReportSeverityFilter =
  | "all"
  | "blocker"
  | "major"
  | "minor";

export function defaultBugReportView(
  report: BugReportV2,
): BugReportView {
  return report.bugs.some((bug) => !bug.fixed)
    ? "not-fixed"
    : "all";
}

export function filterBugReportBugs(
  bugs: readonly BugReportV2Bug[],
  options: {
    readonly view: BugReportView;
    readonly severity: BugReportSeverityFilter;
    readonly query: string;
  },
): readonly BugReportV2Bug[] {
  const query = options.query.trim().toLowerCase();

  return bugs.filter((bug) => {
    const fixedMatch =
      options.view === "all" ||
      (options.view === "fixed" && bug.fixed) ||
      (options.view === "not-fixed" && !bug.fixed);

    const severityMatch =
      options.severity === "all" ||
      bug.severity === options.severity;

    if (!fixedMatch || !severityMatch) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      bug.title,
      bug.problem,
      ...(bug.reproduction ?? []),
      bug.suggestedFix ?? "",
      bug.severity,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  }).sort(compareBugReportPreviewOrder);
}
