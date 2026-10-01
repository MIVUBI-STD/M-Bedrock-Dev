import type { BugReportV2Bug } from "./v2.js";

export type BugReportCopyIssueCode =
  | "title-multiline"
  | "field-too-long"
  | "duplicate-core-copy";

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
    tooLong(issues, base + ".expected", bug.expected, limits.expected);
    tooLong(issues, base + ".observed", bug.observed, limits.observed);

    bug.reproduction?.forEach((step, stepIndex) => {
      tooLong(
        issues,
        `${base}.reproduction[${stepIndex}]`,
        step,
        limits.reproduction,
      );
    });

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
