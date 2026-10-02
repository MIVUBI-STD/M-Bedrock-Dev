import type {
  BugReportClientDocument,
} from "./model.js";

export type BugReportClientDocumentQualityIssueCode =
  | "summary-count-mismatch"
  | "summary-severity-mismatch"
  | "index-count-mismatch"
  | "index-detail-mismatch"
  | "missing-title"
  | "missing-issue"
  | "missing-reproduction"
  | "missing-observed"
  | "missing-expected"
  | "missing-work-checklist"
  | "duplicate-visible-number"
  | "duplicate-visible-title";

export interface BugReportClientDocumentQualityIssue {
  readonly code:
    BugReportClientDocumentQualityIssueCode;
  readonly path: string;
  readonly message: string;
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

export function reviewBugReportClientDocument(
  document: BugReportClientDocument,
): readonly BugReportClientDocumentQualityIssue[] {
  const issues:
    BugReportClientDocumentQualityIssue[] = [];

  if (
    document.summary.visibleIssues !==
    document.issues.length
  ) {
    issues.push({
      code: "summary-count-mismatch",
      path: "summary.visibleIssues",
      message:
        "Visible issue count must match rendered issue detail count.",
    });
  }

  const severityCounts = {
    blocker: document.issues.filter(
      (issue) => issue.severity === "blocker",
    ).length,
    major: document.issues.filter(
      (issue) => issue.severity === "major",
    ).length,
    minor: document.issues.filter(
      (issue) => issue.severity === "minor",
    ).length,
  };

  if (
    document.summary.blocker !== severityCounts.blocker ||
    document.summary.major !== severityCounts.major ||
    document.summary.minor !== severityCounts.minor
  ) {
    issues.push({
      code: "summary-severity-mismatch",
      path: "summary",
      message:
        "Severity summary must match the visible issue set.",
    });
  }

  if (
    document.issueIndex.length !==
    document.issues.length
  ) {
    issues.push({
      code: "index-count-mismatch",
      path: "issueIndex",
      message:
        "Issue index must contain exactly one row for every visible issue.",
    });
  }

  const numbers = new Set<number>();
  const titles = new Set<string>();

  document.issues.forEach(
    (issue, index) => {
      const path = "issues[" + index + "]";

      if (numbers.has(issue.number)) {
        issues.push({
          code: "duplicate-visible-number",
          path: path + ".number",
          message:
            "Client-visible issue numbers must be unique.",
        });
      }
      numbers.add(issue.number);

      const titleKey =
        issue.title.trim().toLowerCase();
      if (titles.has(titleKey)) {
        issues.push({
          code: "duplicate-visible-title",
          path: path + ".title",
          message:
            "Client-visible issue titles should not duplicate each other.",
        });
      }
      titles.add(titleKey);

      if (!hasText(issue.title)) {
        issues.push({
          code: "missing-title",
          path: path + ".title",
          message:
            "Client issue requires a clear plain-language title.",
        });
      }
      if (!hasText(issue.issue)) {
        issues.push({
          code: "missing-issue",
          path: path + ".issue",
          message:
            "Client issue requires a concise gameplay problem and impact.",
        });
      }
      if (
        issue.reproduction.length === 0 ||
        issue.reproduction.some(
          (step) => !hasText(step),
        )
      ) {
        issues.push({
          code: "missing-reproduction",
          path: path + ".reproduction",
          message:
            "Client issue requires clear in-game reproduction steps.",
        });
      }
      if (!hasText(issue.observed)) {
        issues.push({
          code: "missing-observed",
          path: path + ".observed",
          message:
            "Client issue requires the observed wrong result.",
        });
      }
      if (!hasText(issue.expected)) {
        issues.push({
          code: "missing-expected",
          path: path + ".expected",
          message:
            "Client issue requires the expected result.",
        });
      }
      if (
        issue.workChecklist.length === 0 ||
        issue.workChecklist.some(
          (item) => !hasText(item),
        )
      ) {
        issues.push({
          code: "missing-work-checklist",
          path: path + ".workChecklist",
          message:
            "Client issue requires a usable work checklist.",
        });
      }

      const indexItem =
        document.issueIndex[index];
      if (
        !indexItem ||
        indexItem.number !== issue.number ||
        indexItem.id !== issue.id ||
        indexItem.severity !==
          issue.severity ||
        indexItem.category !==
          issue.category ||
        indexItem.status !== issue.status ||
        indexItem.title !== issue.title
      ) {
        issues.push({
          code: "index-detail-mismatch",
          path:
            "issueIndex[" +
            index +
            "]",
          message:
            "Issue index must be a direct projection of issue detail.",
        });
      }
    },
  );

  return issues;
}
