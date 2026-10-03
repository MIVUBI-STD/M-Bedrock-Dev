import type { BugReportV2Bug } from "./v2.js";

export type BugReportCopyIssueCode =
  | "title-multiline"
  | "field-too-long"
  | "duplicate-core-copy"
  | "vague-issue"
  | "technical-issue-copy"
  | "vague-solution"
  | "missing-reproduction"
  | "invalid-reproduction-length"
  | "code-centric-reproduction"
  | "vague-reproduction"
  | "missing-observable-result";

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
  aiAnalysis: 1800,
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

const technicalIssuePatterns = [
  /\brace condition\b/i,
  /\bcallback\b/i,
  /\bsubscriber\b/i,
  /\bevent handler\b/i,
  /\bdynamic propert(?:y|ies)\b/i,
  /\bsource code\b/i,
  /\bcode path\b/i,
  /\bimplementation\b/i,
  /\barchitecture\b/i,
  /\bfunction\b/i,
  /\bscript\b/i,
] as const;

const codeCentricReproductionPatterns = [
  /\bscript\b/i,
  /\bfunction\b/i,
  /\bmethod\b/i,
  /\bclass\b/i,
  /\bvariable\b/i,
  /\bsource code\b/i,
  /\bcode path\b/i,
  /\bimplementation\b/i,
  /\barchitecture\b/i,
  /\.tsx?\b/i,
  /\.jsx?\b/i,
] as const;

const vagueReproductionPatterns = [
  /\btest it\b/i,
  /\bcheck the bug\b/i,
  /\bverify the logic\b/i,
  /\bsee if it happens\b/i,
] as const;

const observableResultPattern =
  /\b(confirm|observe|notice|verify)\b/i;

const vagueSolutionPatterns = [
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
          "Issue must state the player-visible failure and gameplay impact without tentative investigation wording.",
      });
    }

    if (
      technicalIssuePatterns.some((pattern) =>
        pattern.test(bug.problem)
      )
    ) {
      issues.push({
        code: "technical-issue-copy",
        path: base + ".problem",
        message:
          "Issue must describe what the player experiences in-game. Keep implementation causes in Technical Analysis.",
      });
    }

    tooLong(issues, base + ".expected", bug.expected, limits.expected);
    tooLong(issues, base + ".observed", bug.observed, limits.observed);

    if (!bug.reproduction || bug.reproduction.length === 0) {
      issues.push({
        code: "missing-reproduction",
        path: base + ".reproduction",
        message:
          "Tester-facing bugs require a clear How to Reproduce path.",
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
            "Use 2 to 5 concise How to Reproduce steps so a tester can reproduce and verify the bug quickly.",
        });
      }

      bug.reproduction.forEach((step, stepIndex) => {
        const stepPath =
          `${base}.reproduction[${stepIndex}]`;

        tooLong(
          issues,
          stepPath,
          step,
          limits.reproduction,
        );

        if (
          codeCentricReproductionPatterns.some((pattern) =>
            pattern.test(step)
          )
        ) {
          issues.push({
            code: "code-centric-reproduction",
            path: stepPath,
            message:
              "How to Reproduce must describe in-game tester actions and visible outcomes, not source-code or architecture inspection.",
          });
        }

        if (
          vagueReproductionPatterns.some((pattern) =>
            pattern.test(step)
          )
        ) {
          issues.push({
            code: "vague-reproduction",
            path: stepPath,
            message:
              "How to Reproduce step must state a concrete in-game action or observable result.",
          });
        }
      });

      const finalStep =
        bug.reproduction[bug.reproduction.length - 1]!;
      if (!observableResultPattern.test(finalStep)) {
        issues.push({
          code: "missing-observable-result",
          path:
            base +
            ".reproduction[" +
            (bug.reproduction.length - 1) +
            "]",
          message:
            "The final How to Reproduce step must explicitly tell the tester what wrong result to confirm or observe in-game.",
        });
      }
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
        vagueSolutionPatterns.some((pattern) =>
          pattern.test(bug.suggestedFix!)
        )
      ) {
        issues.push({
          code: "vague-solution",
          path: base + ".suggestedFix",
          message:
            "Solution must state a direct repair step and target instead of asking the reader to investigate or generally fix the issue.",
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
