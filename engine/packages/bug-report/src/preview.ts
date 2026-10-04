import {
  shouldIncludeInDefaultBugReport,
} from "./decision.js";
import {
  bugReportV2IssueType,
  type BugReportV2,
  type BugReportV2Bug,
  type BugReportV2IssueType,
} from "./v2.js";
import {
  bugFinderCategoryLabel,
  type BugSeverity,
} from "./vocabulary.js";

export type BugReportPreviewMode =
  | "summary"
  | "standard"
  | "full";

export interface BugReportPreviewOptions {
  readonly mode?: BugReportPreviewMode;
  readonly includeFixed?: boolean;
  readonly includeMinor?: boolean;
}

export interface BugReportPreviewCounts {
  readonly open: number;
  readonly fixed: number;
  readonly total: number;
  readonly blocker: number;
  readonly major: number;
  readonly minor: number;
}

export interface BugReportPreviewBug {
  readonly id: string;
  readonly title: string;
  readonly severity: BugSeverity;
  readonly category: BugReportV2Bug["category"];
  readonly foundBy: BugReportV2Bug["foundBy"];
  readonly issueType: BugReportV2IssueType;
  readonly fixed: boolean;
  readonly issue: string;
  readonly solution?: string;
  readonly expected?: string;
  readonly observed?: string;
  readonly bugTrigger?: readonly string[];
  readonly technicalAnalysis?: string;
  readonly relevantCode?: BugReportV2Bug["relevantCode"];
  readonly mustPreserve?: readonly string[];
}

export interface BugReportPreview {
  readonly map: BugReportV2["map"];
  readonly repairBy: BugReportV2["repairBy"];
  readonly counts: BugReportPreviewCounts;
  readonly bugs: readonly BugReportPreviewBug[];
}

const severityRank: Readonly<Record<BugSeverity, number>> = {
  blocker: 0,
  major: 1,
  minor: 2,
};

export function compareBugReportPreviewOrder(
  left: Pick<BugReportV2Bug, "severity" | "id">,
  right: Pick<BugReportV2Bug, "severity" | "id">,
): number {
  const severity =
    severityRank[left.severity] - severityRank[right.severity];
  if (severity !== 0) return severity;
  return left.id.localeCompare(right.id);
}

function counts(
  report: BugReportV2,
  includeMinor: boolean,
): BugReportPreviewCounts {
  const scoped = report.bugs.filter(
    (bug) =>
      includeMinor ||
      shouldIncludeInDefaultBugReport(bug.severity),
  );
  const open = scoped.filter((bug) => !bug.fixed);
  return {
    open: open.length,
    fixed: scoped.length - open.length,
    total: scoped.length,
    blocker: open.filter((bug) => bug.severity === "blocker").length,
    major: open.filter((bug) => bug.severity === "major").length,
    minor: open.filter((bug) => bug.severity === "minor").length,
  };
}

function projectBug(
  bug: BugReportV2Bug,
  mode: BugReportPreviewMode,
): BugReportPreviewBug {
  const base: BugReportPreviewBug = {
    id: bug.id,
    title: bug.title,
    severity: bug.severity,
    category: bug.category,
    foundBy: bug.foundBy,
    issueType: bugReportV2IssueType(bug),
    fixed: bug.fixed,
    issue: bug.problem,
    ...(bug.reproduction ? { bugTrigger: bug.reproduction } : {}),
    ...(bug.suggestedFix ? { solution: bug.suggestedFix } : {}),
  };

  if (mode === "summary") return base;

  const standard: BugReportPreviewBug = {
    ...base,
    expected: bug.expected,
    observed: bug.observed,
  };

  if (mode === "standard") return standard;

  return {
    ...standard,
    ...(bug.aiAnalysis ? { technicalAnalysis: bug.aiAnalysis } : {}),
    ...(bug.relevantCode ? { relevantCode: bug.relevantCode } : {}),
    ...(bug.mustPreserve ? { mustPreserve: bug.mustPreserve } : {}),
  };
}

export function projectBugReportPreview(
  report: BugReportV2,
  options: BugReportPreviewOptions = {},
): BugReportPreview {
  const mode = options.mode ?? "standard";
  const includeFixed = options.includeFixed ?? false;
  const includeMinor = options.includeMinor ?? false;

  return {
    map: report.map,
    repairBy: report.repairBy,
    counts: counts(report, includeMinor),
    bugs: report.bugs
      .filter((bug) =>
        (includeFixed || !bug.fixed) &&
        (
          includeMinor ||
          shouldIncludeInDefaultBugReport(bug.severity)
        )
      )
      .slice()
      .sort(compareBugReportPreviewOrder)
      .map((bug) => projectBug(bug, mode)),
  };
}

function severityLabel(severity: BugSeverity): string {
  if (severity === "blocker") return "BLOCKER";
  if (severity === "major") return "MAJOR";
  return "MINOR";
}

function line(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function tableCell(value: string): string {
  return line(value).replaceAll("|", "\\|");
}

function technicalLines(
  value: string,
): readonly string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trimEnd())
    .filter((item, index, values) =>
      item.length > 0 ||
      (
        index > 0 &&
        index < values.length - 1
      )
    );
}

export function renderBugReportPreviewMarkdown(
  preview: BugReportPreview,
  mode: BugReportPreviewMode = "standard",
): string {
  const out: string[] = [
    `# ${preview.map.name} — Bug Report`,
    "",
    `**Map Version:** ${preview.map.mapVersion}`,
    `**Tested Version:** ${preview.map.testedVersion}`,
    "",
    `**Open Issues:** ${preview.counts.open}`,
    `Blocker: ${preview.counts.blocker} · Major: ${preview.counts.major} · Minor: ${preview.counts.minor}`,
  ];

  if (preview.bugs.length === 0) {
    out.push(
      "",
      "No gameplay-blocking or materially disruptive open bugs.",
    );
    return out.join("\n") + "\n";
  }

  out.push(
    "",
    "| # | Type | Severity | Category | Issue |",
    "|---:|---|---|---|---|",
  );

  preview.bugs.forEach((bug, index) => {
    out.push(
      `| ${index + 1} | ${bug.issueType} | ${severityLabel(bug.severity)} | ${tableCell(bugFinderCategoryLabel(bug.category))} | ${tableCell(bug.title + ": " + bug.issue)} |`,
    );
  });

  if (mode !== "full") {
    return out.join("\n") + "\n";
  }

  out.push("", "## Details");

  for (const bug of preview.bugs) {
    out.push(
      "",
      `### [${bug.issueType} · ${severityLabel(bug.severity)}] ${bug.id} — ${line(bug.title)}`,
      `**Issue:** ${line(bug.issue)}`,
    );

    if (bug.observed) {
      out.push(
        `**Observed:** ${line(bug.observed)}`,
      );
    }
    if (bug.expected) {
      out.push(
        `**Expected:** ${line(bug.expected)}`,
      );
    }
    if (bug.solution) {
      out.push(
        `**Solution:** ${line(bug.solution)}`,
      );
    }

    if (bug.technicalAnalysis) {
      out.push(
        "",
        "**Technical Analysis:**",
        ...technicalLines(
          bug.technicalAnalysis,
        ),
      );
    }

    if (bug.relevantCode?.length) {
      out.push("**Relevant Code:**");
      for (const item of bug.relevantCode) {
        out.push(`- \`${item.file}\` — ${line(item.reason)}`);
      }
    }

    if (bug.mustPreserve?.length) {
      out.push("**Must Preserve:**");
      for (const item of bug.mustPreserve) {
        out.push(`- ${line(item)}`);
      }
    }
  }

  return out.join("\n") + "\n";
}
