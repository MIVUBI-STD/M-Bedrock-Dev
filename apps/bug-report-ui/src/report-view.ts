import {
  compareBugReportPreviewOrder,
  type BugReportV2Bug,
} from "../../../engine/packages/bug-report/src/index.js";

export type BugReportSeverityFilter =
  | "all"
  | "blocker"
  | "major"
  | "minor";

export function filterBugReportBugs(
  bugs: readonly BugReportV2Bug[],
  options: {
    readonly severity: BugReportSeverityFilter;
    readonly query: string;
  },
): readonly BugReportV2Bug[] {
  const query = options.query.trim().toLowerCase();

  return bugs.filter((bug) => {
    if (bug.fixed) return false;

    const severityMatch =
      options.severity === "all" ||
      bug.severity === options.severity;

    if (!severityMatch) {
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
