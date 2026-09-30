import type {
  BugFinderCategory,
  BugSeverity,
} from "./vocabulary.js";

/**
 * Legacy Bug Report V1 compatibility surface.
 *
 * @deprecated New reports must use BugReportV2. This module remains only for
 * reading, validating, and migrating existing V1 files.
 */
export const BUG_REPORT_SCHEMA = "m-bedrock-bug-report/v1" as const;

export type BugFoundBy = "ai" | "tester" | "ai+tester";
export type BugVerification = "candidate" | "observed" | "verified";

export interface BugReportMap {
  readonly name: string;
  readonly version: string;
  readonly minecraftVersion: string;
  readonly drive: string;
}

export interface BugObservation {
  readonly gameplay?: string;
  readonly code?: string;
}

export interface BugReproducibility {
  readonly attempts: number;
  readonly reproduced: number;
}

export interface BugEvidence {
  readonly description: string;
  readonly drive: string;
}

export interface RelevantCodeLocation {
  readonly file: string;
  readonly reason: string;
  readonly lines?: string;
}

export interface RuntimeConditions {
  readonly players?: number;
  readonly activeArenas?: number;
  readonly condition?: string;
  readonly server?: string;
  readonly mode?: string;
}

export interface BugReportBug {
  readonly title: string;
  readonly severity: BugSeverity;
  readonly foundBy: BugFoundBy;
  readonly verification: BugVerification;
  readonly problem: string;
  readonly preconditions?: readonly string[];
  readonly reproduction?: readonly string[];
  readonly reproducibility?: BugReproducibility;
  readonly expected: string;
  readonly observed: BugObservation;
  readonly evidence?: readonly BugEvidence[];
  readonly verifyBug?: readonly string[];
  readonly codeFlow?: readonly string[];
  readonly diagnosis?: string;
  readonly rootCause?: string;
  readonly relevantCode?: readonly RelevantCodeLocation[];
  readonly repairDirection?: string;
  readonly mustPreserve?: readonly string[];
  readonly fixValidation?: readonly string[];
  readonly runtimeConditions?: RuntimeConditions;
}

export interface BugFinderReport {
  readonly category: BugFinderCategory;
  readonly bugs: readonly BugReportBug[];
}

export interface BugReportV1 {
  readonly schema: typeof BUG_REPORT_SCHEMA;
  readonly map: BugReportMap;
  readonly bugFinders: readonly BugFinderReport[];
}

export type BugReportValidationIssueCode =
  | "duplicate-category"
  | "empty-finder"
  | "invalid-origin-verification"
  | "missing-gameplay-observation"
  | "missing-code-observation"
  | "tester-contains-code-analysis"
  | "ai-contains-gameplay-observation"
  | "candidate-missing-verification-plan"
  | "verified-missing-reproduction"
  | "verified-tester-missing-reproducibility"
  | "insufficient-verified-reproduction"
  | "invalid-reproducibility-count"
  | "root-cause-without-code-evidence"
  | "repair-direction-without-diagnosis"
  | "code-flow-without-ai-evidence"
  | "runtime-conditions-outside-runtime-category";

export interface BugReportValidationIssue {
  readonly code: BugReportValidationIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface BugReportValidationResult {
  readonly valid: boolean;
  readonly issues: readonly BugReportValidationIssue[];
}

const runtimeCategories = new Set<BugFinderCategory>([
  "performance-stability",
  "compatibility",
]);

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasItems<T>(value: readonly T[] | undefined): value is readonly T[] {
  return Array.isArray(value) && value.length > 0;
}

function pushIssue(
  issues: BugReportValidationIssue[],
  code: BugReportValidationIssueCode,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function validateBug(
  category: BugFinderCategory,
  bug: BugReportBug,
  path: string,
  issues: BugReportValidationIssue[],
): void {
  const gameplayObserved = hasText(bug.observed.gameplay);
  const codeObserved = hasText(bug.observed.code);

  if (bug.foundBy === "ai") {
    if (bug.verification !== "candidate") {
      pushIssue(
        issues,
        "invalid-origin-verification",
        path + ".verification",
        "AI-only findings must remain candidate until gameplay evidence exists.",
      );
    }
    if (!codeObserved) {
      pushIssue(
        issues,
        "missing-code-observation",
        path + ".observed.code",
        "AI findings require concrete code or architecture observation.",
      );
    }
    if (gameplayObserved) {
      pushIssue(
        issues,
        "ai-contains-gameplay-observation",
        path + ".observed.gameplay",
        "AI-only findings cannot claim tester gameplay observation.",
      );
    }
  }

  if (bug.foundBy === "tester") {
    if (bug.verification === "candidate") {
      pushIssue(
        issues,
        "invalid-origin-verification",
        path + ".verification",
        "Tester findings are gameplay observations, not AI candidates.",
      );
    }
    if (!gameplayObserved) {
      pushIssue(
        issues,
        "missing-gameplay-observation",
        path + ".observed.gameplay",
        "Tester findings require gameplay observation.",
      );
    }
    if (
      codeObserved ||
      hasItems(bug.codeFlow) ||
      hasText(bug.diagnosis) ||
      hasText(bug.rootCause) ||
      hasItems(bug.relevantCode) ||
      hasText(bug.repairDirection)
    ) {
      pushIssue(
        issues,
        "tester-contains-code-analysis",
        path,
        "Tester-only findings must contain gameplay evidence only; code or architecture analysis requires foundBy=ai+tester.",
      );
    }
  }

  if (bug.foundBy === "ai+tester") {
    if (bug.verification === "candidate") {
      pushIssue(
        issues,
        "invalid-origin-verification",
        path + ".verification",
        "AI+tester findings already have gameplay evidence and cannot remain candidate.",
      );
    }
    if (!gameplayObserved) {
      pushIssue(
        issues,
        "missing-gameplay-observation",
        path + ".observed.gameplay",
        "AI+tester findings require tester gameplay observation.",
      );
    }
    if (!codeObserved) {
      pushIssue(
        issues,
        "missing-code-observation",
        path + ".observed.code",
        "AI+tester findings require independent technical code or architecture evidence.",
      );
    }
  }

  if (bug.verification === "candidate" && !hasItems(bug.verifyBug)) {
    pushIssue(
      issues,
      "candidate-missing-verification-plan",
      path + ".verifyBug",
      "Candidate findings must tell the tester how to prove or falsify the bug.",
    );
  }

  if (bug.verification === "verified") {
    if (!hasItems(bug.reproduction)) {
      pushIssue(
        issues,
        "verified-missing-reproduction",
        path + ".reproduction",
        "Verified gameplay bugs require a proven reproduction path.",
      );
    }

    if (bug.foundBy === "tester") {
      if (!bug.reproducibility) {
        pushIssue(
          issues,
          "verified-tester-missing-reproducibility",
          path + ".reproducibility",
          "Tester-only verified bugs require measured reproducibility.",
        );
      } else if (bug.reproducibility.reproduced < 2) {
        pushIssue(
          issues,
          "insufficient-verified-reproduction",
          path + ".reproducibility.reproduced",
          "Tester-only verified bugs require at least two successful reproductions.",
        );
      }
    }
  }

  if (
    bug.reproducibility &&
    bug.reproducibility.reproduced > bug.reproducibility.attempts
  ) {
    pushIssue(
      issues,
      "invalid-reproducibility-count",
      path + ".reproducibility",
      "Reproduced count cannot exceed attempts.",
    );
  }

  if (hasText(bug.rootCause) && !codeObserved) {
    pushIssue(
      issues,
      "root-cause-without-code-evidence",
      path + ".rootCause",
      "Root cause requires supporting code observation.",
    );
  }

  if (hasText(bug.repairDirection) && !hasText(bug.diagnosis)) {
    pushIssue(
      issues,
      "repair-direction-without-diagnosis",
      path + ".repairDirection",
      "Repair direction requires a technical diagnosis first.",
    );
  }

  if (hasItems(bug.codeFlow) && bug.foundBy === "tester") {
    pushIssue(
      issues,
      "code-flow-without-ai-evidence",
      path + ".codeFlow",
      "Code flow is technical evidence and requires AI involvement.",
    );
  }

  if (bug.runtimeConditions && !runtimeCategories.has(category)) {
    pushIssue(
      issues,
      "runtime-conditions-outside-runtime-category",
      path + ".runtimeConditions",
      "Runtime conditions are reserved for performance-stability and compatibility findings.",
    );
  }
}

export function validateBugReportSemantics(
  report: BugReportV1,
): BugReportValidationResult {
  const issues: BugReportValidationIssue[] = [];
  const seenCategories = new Set<BugFinderCategory>();

  report.bugFinders.forEach((finder, finderIndex) => {
    const finderPath = "bugFinders[" + finderIndex + "]";

    if (seenCategories.has(finder.category)) {
      pushIssue(
        issues,
        "duplicate-category",
        finderPath + ".category",
        "Each bug finder category may appear only once per report.",
      );
    }
    seenCategories.add(finder.category);

    if (finder.bugs.length === 0) {
      pushIssue(
        issues,
        "empty-finder",
        finderPath + ".bugs",
        "Bug finders with zero bugs must be omitted from the fixing report.",
      );
    }

    finder.bugs.forEach((bug, bugIndex) => {
      validateBug(
        finder.category,
        bug,
        finderPath + ".bugs[" + bugIndex + "]",
        issues,
      );
    });
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

