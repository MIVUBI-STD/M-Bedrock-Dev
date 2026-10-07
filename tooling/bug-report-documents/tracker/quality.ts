import type { BugTrackerDocument, TrackerIssue } from "./model.js";

export type TrackerQualityCode =
  | "NO_TEST_STEPS"
  | "NO_EXPECTED"
  | "NO_TECHNICAL_EXPLANATION"
  | "NO_RECOMMENDED_FIX"
  | "SELF_CONFIRMING_TEST_STEP";

export interface TrackerQualityFinding {
  readonly issueId: string;
  readonly code: TrackerQualityCode;
  readonly message: string;
}

function issueQuality(issue: TrackerIssue): TrackerQualityFinding[] {
  const findings: TrackerQualityFinding[] = [];
  if (issue.reproduction.length === 0) {
    findings.push({
      issueId: issue.id,
      code: "NO_TEST_STEPS",
      message: "No evidence-backed in-game test steps are available.",
    });
  }
  if (!issue.expected.trim()) {
    findings.push({
      issueId: issue.id,
      code: "NO_EXPECTED",
      message: "No evidence-backed expected result is available.",
    });
  }
  if (!(issue.technicalAnalysis?.trim() || issue.observed.trim())) {
    findings.push({
      issueId: issue.id,
      code: "NO_TECHNICAL_EXPLANATION",
      message: "No technical explanation/evidence is available.",
    });
  }
  if (!issue.resolution?.trim()) {
    findings.push({
      issueId: issue.id,
      code: "NO_RECOMMENDED_FIX",
      message: "No evidence-backed recommended fix is available.",
    });
  }

  const selfConfirming = issue.reproduction.some((step) =>
    /^confirm\b/i.test(step.trim()),
  );
  if (selfConfirming) {
    findings.push({
      issueId: issue.id,
      code: "SELF_CONFIRMING_TEST_STEP",
      message: "A test step tells the tester to confirm the bug instead of only describing an in-game action/observation.",
    });
  }
  return findings;
}

export function auditBugTrackerInformation(
  document: BugTrackerDocument,
): TrackerQualityFinding[] {
  return document.games.flatMap((game) =>
    game.levels.flatMap((level) =>
      level.issues.flatMap(issueQuality),
    ),
  );
}
