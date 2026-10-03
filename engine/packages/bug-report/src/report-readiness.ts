import type {
  BugReportV2Bug,
} from "./v2.js";

export type BugReportReadinessIssueCode =
  | "missing-bug-trigger"
  | "ai-missing-analysis"
  | "ai-missing-relevant-code"
  | "solution-without-support"
  | "too-many-relevant-code-locations";

export interface BugReportReadinessIssue {
  readonly code: BugReportReadinessIssueCode;
  readonly path: string;
  readonly message: string;
}

function hasItems<T>(
  value: readonly T[] | undefined,
): value is readonly T[] {
  return Array.isArray(value) && value.length > 0;
}

export function reviewBugReportReadiness(
  bugs: readonly BugReportV2Bug[],
): readonly BugReportReadinessIssue[] {
  const issues: BugReportReadinessIssue[] = [];

  bugs.forEach((bug, index) => {
    const base = `bugs[${index}]`;

    if (!hasItems(bug.reproduction)) {
      issues.push({
        code: "missing-bug-trigger",
        path: base + ".reproduction",
        message:
          "Tester-facing bugs require a clear How to Reproduce path.",
      });
    }

    if (
      bug.foundBy === "ai" &&
      (
        typeof bug.aiAnalysis !== "string" ||
        bug.aiAnalysis.trim().length === 0
      )
    ) {
      issues.push({
        code: "ai-missing-analysis",
        path: base + ".aiAnalysis",
        message:
          "AI-found bugs require Technical Analysis that explains the evidence-backed technical basis.",
      });
    }

    if (
      bug.foundBy === "ai" &&
      !hasItems(bug.relevantCode)
    ) {
      issues.push({
        code: "ai-missing-relevant-code",
        path: base + ".relevantCode",
        message:
          "AI-found bugs require a focused Relevant Code set that supports the finding.",
      });
    }

    const hasTechnicalAnalysis =
      typeof bug.aiAnalysis === "string" &&
      bug.aiAnalysis.trim().length > 0;
    const hasRelevantCode = hasItems(bug.relevantCode);

    if (
      bug.suggestedFix !== undefined &&
      !hasTechnicalAnalysis &&
      !hasRelevantCode
    ) {
      issues.push({
        code: "solution-without-support",
        path: base + ".suggestedFix",
        message:
          "Solution requires supporting Technical Analysis or Relevant Code.",
      });
    }

    if (
      bug.relevantCode !== undefined &&
      bug.relevantCode.length > 3
    ) {
      issues.push({
        code: "too-many-relevant-code-locations",
        path: base + ".relevantCode",
        message:
          "Relevant Code must stay focused on at most three primary locations.",
      });
    }
  });

  return issues;
}
