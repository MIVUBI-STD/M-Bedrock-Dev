import {
  compareBugReportPreviewOrder,
} from "../preview.js";
import {
  shouldIncludeInDefaultBugReport,
} from "../decision.js";
import {
  bugFinderCategoryLabel,
} from "../vocabulary.js";
import {
  bugReportV2IssueType,
  type BugReportV2,
  type BugReportV2Bug,
} from "../v2.js";
import {
  BUG_REPORT_CLIENT_DOCUMENT_SCHEMA,
  type BugReportClientDocument,
  type BugReportClientIssue,
  type BugReportClientIssueStatus,
} from "./model.js";

export interface ProjectBugReportClientDocumentOptions {
  readonly includeFixed?: boolean;
  readonly includeMinor?: boolean;
}

const severityLegend =
  [
    {
      severity: "blocker",
      label: "Blocker",
      meaning:
        "Stops normal progression, prevents the objective, or leaves no normal in-game recovery.",
    },
    {
      severity: "major",
      label: "Major",
      meaning:
        "Materially breaks core gameplay, important player state, or fairness while play can still continue or recover.",
    },
    {
      severity: "minor",
      label: "Minor",
      meaning:
        "Limited player-visible issue that does not materially affect core gameplay.",
    },
  ] as const;

function status(
  bug: BugReportV2Bug,
): BugReportClientIssueStatus {
  return bug.fixed ? "fixed" : "open";
}

export function deriveBugReportWorkChecklist(
  bug: BugReportV2Bug,
): readonly string[] {
  const items: string[] = [];

  items.push(
    bug.suggestedFix?.trim()
      ? "Apply the approved Resolution."
      : "Implement the smallest fix that removes the observed defect while preserving the expected gameplay contract.",
    "Retest using every How to Reproduce step and confirm the observed wrong result no longer occurs.",
    "Confirm the Expected result is reached on the same trigger path.",
  );

  for (const preserve of bug.mustPreserve ?? []) {
    items.push(
      "Verify preserved behavior: " + preserve,
    );
  }

  return items;
}

function projectIssue(
  bug: BugReportV2Bug,
  number: number,
): BugReportClientIssue {
  return {
    number,
    id: bug.id,
    issueType: bugReportV2IssueType(bug),
    severity: bug.severity,
    status: status(bug),
    category: bugFinderCategoryLabel(bug.category),
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
    ...(bug.aiAnalysis === undefined
      ? {}
      : {
          technicalAnalysis:
            bug.aiAnalysis,
        }),
    ...(bug.relevantCode === undefined
      ? {}
      : {
          relevantCode:
            bug.relevantCode,
        }),
    ...(bug.mustPreserve === undefined
      ? {}
      : {
          mustPreserve:
            bug.mustPreserve,
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
  const includeMinor =
    options.includeMinor ?? true;

  const visible = report.bugs
    .filter((bug) =>
      (includeFixed || !bug.fixed) &&
      (
        includeMinor ||
        shouldIncludeInDefaultBugReport(bug.severity)
      )
    )
    .slice()
    .sort(compareBugReportPreviewOrder);

  const openIssues =
    report.bugs.filter((bug) =>
      !bug.fixed &&
      (
        includeMinor ||
        shouldIncludeInDefaultBugReport(bug.severity)
      )
    ).length;
  const fixedIssues =
    report.bugs.filter((bug) =>
      bug.fixed &&
      (
        includeMinor ||
        shouldIncludeInDefaultBugReport(bug.severity)
      )
    ).length;

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
      ? "No open findings are recorded for this report."
      : (
          String(issues.length) +
          " open finding" +
          (issues.length === 1 ? "" : "s") +
          " are included in this report."
        );

  return {
    schema:
      BUG_REPORT_CLIENT_DOCUMENT_SCHEMA,
    title:
      report.map.name + " — Bug Report",
    subtitle:
      "Current approved gameplay and design findings",
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
    severityLegend:
      includeMinor
        ? severityLegend
        : severityLegend.filter(
            (entry) => entry.severity !== "minor",
          ),
    issues,
  };
}
