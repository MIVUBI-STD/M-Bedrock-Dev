import {
  compareBugReportPreviewOrder,
} from "../preview.js";
import type {
  BugReportV2,
  BugReportV2Bug,
} from "../v2.js";
import {
  BUG_REPORT_CLIENT_DOCUMENT_SCHEMA,
  type BugReportClientDocument,
  type BugReportClientIssue,
  type BugReportClientIssueStatus,
} from "./model.js";

export interface ProjectBugReportClientDocumentOptions {
  readonly includeFixed?: boolean;
}

const severityLegend =
  [
    {
      severity: "blocker",
      label: "Blocker",
      meaning:
        "Prevents normal progression or makes the affected gameplay unusable.",
    },
    {
      severity: "major",
      label: "Major",
      meaning:
        "Materially affects gameplay, state, fairness, or reliability.",
    },
    {
      severity: "minor",
      label: "Minor",
      meaning:
        "Limited issue that does not prevent normal gameplay.",
    },
  ] as const;

function status(
  bug: BugReportV2Bug,
): BugReportClientIssueStatus {
  return bug.fixed ? "fixed" : "open";
}

function projectIssue(
  bug: BugReportV2Bug,
  number: number,
): BugReportClientIssue {
  return {
    number,
    severity: bug.severity,
    status: status(bug),
    title: bug.title,
    issue: bug.problem,
    reproduction: [...(bug.reproduction ?? [])],
    observed: bug.observed,
    expected: bug.expected,
    ...(bug.suggestedFix === undefined
      ? {}
      : {
          recommendedResolution:
            bug.suggestedFix,
        }),
  };
}

export function projectBugReportClientDocument(
  report: BugReportV2,
  options:
    ProjectBugReportClientDocumentOptions = {},
): BugReportClientDocument {
  const includeFixed =
    options.includeFixed ?? false;
  const visible = report.bugs
    .filter((bug) =>
      includeFixed || !bug.fixed
    )
    .slice()
    .sort(compareBugReportPreviewOrder);

  const openIssues =
    report.bugs.filter((bug) => !bug.fixed).length;
  const fixedIssues =
    report.bugs.length - openIssues;

  const issues = visible.map(
    (bug, index) =>
      projectIssue(bug, index + 1),
  );

  const blocker =
    visible.filter(
      (bug) => bug.severity === "blocker",
    ).length;
  const major =
    visible.filter(
      (bug) => bug.severity === "major",
    ).length;
  const minor =
    visible.filter(
      (bug) => bug.severity === "minor",
    ).length;

  const statement =
    issues.length === 0
      ? "No open issues are recorded for this report."
      : (
          String(issues.length) +
          " confirmed issue" +
          (issues.length === 1 ? "" : "s") +
          " are included in this client report."
        );

  return {
    schema:
      BUG_REPORT_CLIENT_DOCUMENT_SCHEMA,
    documentType: "Bug Report",
    title:
      report.map.name + " — Bug Report",
    subtitle:
      "Confirmed gameplay issues and testing summary",
    audience: "client",
    map: {
      name: report.map.name,
      mapVersion: report.map.mapVersion,
      testedVersion:
        report.map.testedVersion,
    },
    summary: {
      visibleIssues: issues.length,
      openIssues,
      fixedIssues,
      blocker,
      major,
      minor,
      statement,
    },
    severityLegend,
    issueIndex: issues.map((issue) => ({
      number: issue.number,
      severity: issue.severity,
      status: issue.status,
      title: issue.title,
    })),
    issues,
    source: {
      schema: report.schema,
      issueScope:
        includeFixed ? "all" : "open",
    },
  };
}
