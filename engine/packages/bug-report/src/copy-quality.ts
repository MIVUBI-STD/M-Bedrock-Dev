import type { BugReportV2Bug } from "./v2.js";

export type BugReportCopyIssueCode =
  | "title-multiline"
  | "field-too-long"
  | "duplicate-core-copy"
  | "vague-issue"
  | "vague-action"
  | "missing-reproduction"
  | "invalid-reproduction-length";

export interface BugReportCopyIssue {
  readonly code: BugReportCopyIssueCode;
  readonly path: string;
  readonly message: string;
}

const limits = {
  title: 90,
  problem: 220,
  expected: 180,
  observed: 180,
  reproduction: 160,
  aiAnalysis: 420,
  suggestedFix: 220,
  relevantCodeReason: 180,
  mustPreserve: 160,
} as const;

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const vagueIssuePatterns = [
  /\bthere (?:may|might|could) be\b/i,
  /\bappears? to\b/i,
  /\bseems? to\b/i,
  /\bpossible issue\b/i,
  /\bpotential issue\b/i,
  /\bneeds? checking\b/i,
] as const;

const vagueActionPatterns = [
  /\bcheck (?:the|this)\b/i,
  /\binvestigate\b/i,
  /\breview (?:the|this)\b/i,
  /\blook into\b/i,
  /\bfix (?:the|this) issue\b/i,
  /\badjust as needed\b/i,
] as const;

function tooLong(
  issues: BugReportCopyIssue[],
  path: string,
  value: string,
  max: number,
): void {
  if (compact(value).length > max) {
    issues.push({
      code: "field-too-long",
      path,
      message: `Keep this field at or below ${max} characters for scan readability.`,
    });
  }
}

export function reviewBugReportCopy(
  bugs: readonly BugReportV2Bug[],
): readonly BugReportCopyIssue[] {
  const issues: BugReportCopyIssue[] = [];

  bugs.forEach((bug, index) => {
    const base = `bugs[${index}]`;

    if (/\r|\n/.test(bug.title)) {
      issues.push({
        code: "title-multiline",
        path: base + ".title",
        message: "Title must stay on one line.",
      });
    }

    tooLong(issues, base + ".title", bug.title, limits.title);
    tooLong(issues, base + ".problem", bug.problem, limits.problem);

    if (vagueIssuePatterns.some((pattern) => pattern.test(bug.problem))) {
      issues.push({
        code: "vague-issue",
        path: base + ".problem",
        message:
          "Issue must state the affected feature, concrete failure, and gameplay impact without tentative investigation wording.",
      });
    }
    tooLong(issues, base + ".expected", bug.expected, limits.expected);
    tooLong(issues, base + ".observed", bug.observed, limits.observed);

    if (!bug.reproduction || bug.reproduction.length === 0) {
      issues.push({
        code: "missing-reproduction",
        path: base + ".reproduction",
        message:
          "Tester-facing bugs require a concise in-game reproduction / verification path.",
      });
    } else {
      if (
        bug.reproduction.length < 2 ||
        bug.reproduction.length > 5
      ) {
        issues.push({
          code: "invalid-reproduction-length",
          path: base + ".reproduction",
          message:
            "Use 2 to 5 concise reproduction steps so a tester can verify the bug quickly.",
        });
      }

      bug.reproduction.forEach((step, stepIndex) => {
        tooLong(
          issues,
          `${base}.reproduction[${stepIndex}]`,
          step,
          limits.reproduction,
        );
      });
    }

    if (bug.aiAnalysis) {
      tooLong(
        issues,
        base + ".aiAnalysis",
        bug.aiAnalysis,
        limits.aiAnalysis,
      );
    }

    if (bug.suggestedFix) {
      tooLong(
        issues,
        base + ".suggestedFix",
        bug.suggestedFix,
        limits.suggestedFix,
      );

      if (
        vagueActionPatterns.some((pattern) =>
          pattern.test(bug.suggestedFix!)
        )
      ) {
        issues.push({
          code: "vague-action",
          path: base + ".suggestedFix",
          message:
            "Action must state a direct repair step and target instead of asking the reader to investigate or generally fix the issue.",
        });
      }
    }

    bug.relevantCode?.forEach((item, itemIndex) => {
      tooLong(
        issues,
        `${base}.relevantCode[${itemIndex}].reason`,
        item.reason,
        limits.relevantCodeReason,
      );
    });

    bug.mustPreserve?.forEach((item, itemIndex) => {
      tooLong(
        issues,
        `${base}.mustPreserve[${itemIndex}]`,
        item,
        limits.mustPreserve,
      );
    });

    const core = [
      ["problem", compact(bug.problem)],
      ["expected", compact(bug.expected)],
      ["observed", compact(bug.observed)],
    ] as const;

    for (let left = 0; left < core.length; left += 1) {
      for (let right = left + 1; right < core.length; right += 1) {
        if (
          core[left]![1].toLowerCase() ===
          core[right]![1].toLowerCase()
        ) {
          issues.push({
            code: "duplicate-core-copy",
            path:
              base +
              "." +
              core[left]![0] +
              " / " +
              core[right]![0],
            message:
              "Problem, Expected, and Observed must perform distinct roles instead of repeating the same sentence.",
          });
        }
      }
    }
  });

  return issues;
}
