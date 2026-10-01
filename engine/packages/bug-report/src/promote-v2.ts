import { reviewBugReportCopy } from "./copy-quality.js";
import {
  createBugReportV2,
  type CreateBugReportV2BugInput,
} from "./create-v2.js";
import type {
  BugReportV2,
  BugReportV2Map,
  BugReportV2RepairBy,
} from "./v2.js";

export type ConfirmedBugStatus = "confirmed-defect";

export type DefectConfirmationBasis =
  | "tester-reproduction"
  | "authored-contract-violation"
  | "runtime-observation";

export interface DefectConfirmation {
  readonly basis: DefectConfirmationBasis;
  readonly evidence: string;
}

export interface ConfirmedBugReportInput
  extends Omit<CreateBugReportV2BugInput, "fixed"> {
  readonly status: ConfirmedBugStatus;
  readonly confirmation: DefectConfirmation;
}

export interface PromoteConfirmedBugsInput {
  readonly map: BugReportV2Map;
  readonly repairBy: BugReportV2RepairBy;
  readonly bugs: readonly ConfirmedBugReportInput[];
}

export type BugReportPromotionIssueCode =
  | "no-confirmed-bugs"
  | "tester-missing-reproduction"
  | "ai-missing-analysis"
  | "ai-missing-relevant-code"
  | "suggested-fix-without-analysis"
  | "too-many-relevant-code-locations"
  | "duplicate-bug-id"
  | "invalid-confirmation"
  | "ai-unproven-defect"
  | "invalid-confirmed-defect"
  | "duplicate-semantic-key"
  | "unresolved-defect-group"
  | "invalid-defect-group-resolution"
  | "unused-defect-group-resolution"
  | "copy-quality";

export interface BugReportPromotionIssue {
  readonly code: BugReportPromotionIssueCode;
  readonly bugId?: string;
  readonly message: string;
}

export type PromoteConfirmedBugsResult =
  | {
      readonly ok: true;
      readonly report: BugReportV2;
      readonly issues: readonly [];
    }
  | {
      readonly ok: false;
      readonly issues: readonly BugReportPromotionIssue[];
    };

function hasItems<T>(
  value: readonly T[] | undefined,
): value is readonly T[] {
  return Array.isArray(value) && value.length > 0;
}

export function reviewConfirmedBugInputs(
  bugs: readonly ConfirmedBugReportInput[],
): readonly BugReportPromotionIssue[] {
  const issues: BugReportPromotionIssue[] = [];
  const seenIds = new Set<string>();

  if (bugs.length === 0) {
    issues.push({
      code: "no-confirmed-bugs",
      message:
        "A developer-facing Bug Report V2 must contain at least one confirmed defect.",
    });
  }

  for (const bug of bugs) {
    if (seenIds.has(bug.id)) {
      issues.push({
        code: "duplicate-bug-id",
        bugId: bug.id,
        message: "Confirmed bug ids must be unique within one report.",
      });
    }
    seenIds.add(bug.id);

    if (!bug.confirmation.evidence.trim()) {
      issues.push({
        code: "invalid-confirmation",
        bugId: bug.id,
        message:
          "Confirmed defects require a concise evidence statement describing why the defect itself is established.",
      });
    }

    if (
      bug.foundBy === "ai" &&
      bug.confirmation.basis === "tester-reproduction"
    ) {
      issues.push({
        code: "ai-unproven-defect",
        bugId: bug.id,
        message:
          "AI-found defects require authored contract violation or runtime observation.",
      });
    }

    if (
      bug.foundBy === "tester" &&
      !hasItems(bug.reproduction)
    ) {
      issues.push({
        code: "tester-missing-reproduction",
        bugId: bug.id,
        message:
          "Tester-found confirmed defects must include a reproduction path for the developer.",
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
        bugId: bug.id,
        message:
          "AI-found confirmed defects must include AI Analysis explaining the technical basis.",
      });
    }

    if (
      bug.foundBy === "ai" &&
      !hasItems(bug.relevantCode)
    ) {
      issues.push({
        code: "ai-missing-relevant-code",
        bugId: bug.id,
        message:
          "AI-found confirmed defects must point to the small set of source locations that support the finding.",
      });
    }

    if (
      bug.suggestedFix !== undefined &&
      bug.aiAnalysis === undefined &&
      !hasItems(bug.relevantCode)
    ) {
      issues.push({
        code: "suggested-fix-without-analysis",
        bugId: bug.id,
        message:
          "Suggested Fix requires supporting AI Analysis or Relevant Code.",
      });
    }

    if (
      bug.relevantCode !== undefined &&
      bug.relevantCode.length > 3
    ) {
      issues.push({
        code: "too-many-relevant-code-locations",
        bugId: bug.id,
        message:
          "Relevant Code should contain at most three primary locations; keep the report focused on where the developer should look first.",
      });
    }
  }

  const copyIssues = reviewBugReportCopy(
    bugs.map((bug) => ({
      id: bug.id,
      fixed: false,
      severity: bug.severity,
      category: bug.category,
      foundBy: bug.foundBy,
      title: bug.title,
      problem: bug.problem,
      expected: bug.expected,
      observed: bug.observed,
      ...(bug.reproduction === undefined
        ? {}
        : { reproduction: bug.reproduction }),
      ...(bug.aiAnalysis === undefined
        ? {}
        : { aiAnalysis: bug.aiAnalysis }),
      ...(bug.relevantCode === undefined
        ? {}
        : { relevantCode: bug.relevantCode }),
      ...(bug.suggestedFix === undefined
        ? {}
        : { suggestedFix: bug.suggestedFix }),
      ...(bug.mustPreserve === undefined
        ? {}
        : { mustPreserve: bug.mustPreserve }),
    })),
  );

  for (const issue of copyIssues) {
    issues.push({
      code: "copy-quality",
      message: issue.path + ": " + issue.message,
    });
  }

  return issues;
}

export function promoteConfirmedBugsToV2(
  input: PromoteConfirmedBugsInput,
): PromoteConfirmedBugsResult {
  const issues = reviewConfirmedBugInputs(input.bugs);
  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    };
  }

  return {
    ok: true,
    report: createBugReportV2({
      map: input.map,
      repairBy: input.repairBy,
      bugs: input.bugs.map((bug) => ({
        id: bug.id,
        severity: bug.severity,
        category: bug.category,
        foundBy: bug.foundBy,
        title: bug.title,
        problem: bug.problem,
        expected: bug.expected,
        observed: bug.observed,
        ...(bug.reproduction === undefined
          ? {}
          : { reproduction: bug.reproduction }),
        ...(bug.aiAnalysis === undefined
          ? {}
          : { aiAnalysis: bug.aiAnalysis }),
        ...(bug.relevantCode === undefined
          ? {}
          : { relevantCode: bug.relevantCode }),
        ...(bug.suggestedFix === undefined
          ? {}
          : { suggestedFix: bug.suggestedFix }),
        ...(bug.mustPreserve === undefined
          ? {}
          : { mustPreserve: bug.mustPreserve }),
      })),
    }),
    issues: [],
  };
}
