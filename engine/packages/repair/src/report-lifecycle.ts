import type {
  BugReportV2,
  BugReportV2Bug,
  BugReportV2RepairBy,
} from "../../bug-report/src/index.js";
import type {
  ValidationRunTrace,
  ValidationTraceReport,
} from "../../validation/src/index.js";

export interface BugRepairTarget {
  readonly bugId: string;
  readonly repairBy: BugReportV2RepairBy;
  readonly title: string;
  readonly suggestedFix?: string;
  readonly relevantCode: readonly {
    readonly file: string;
    readonly reason: string;
  }[];
  readonly mustPreserve: readonly string[];
}

export interface BugRepairVerification {
  readonly bugId: string;
  readonly validationRunIds: readonly string[];
  readonly preservationInvariantIds?: readonly string[];
}

function findBug(
  report: BugReportV2,
  bugId: string,
): BugReportV2Bug {
  const bug = report.bugs.find((item) => item.id === bugId);
  if (!bug) {
    throw new Error("Bug repair target does not exist in the report.");
  }
  return bug;
}

export function selectBugRepairTarget(
  report: BugReportV2,
  bugId: string,
  repairBy: BugReportV2RepairBy,
): BugRepairTarget {
  if (report.repairBy !== repairBy) {
    throw new Error(
      "Repair actor does not match the report Repair By owner.",
    );
  }

  const bug = findBug(report, bugId);
  if (bug.fixed) {
    throw new Error("Bug repair target is already fixed.");
  }

  return {
    bugId: bug.id,
    repairBy,
    title: bug.title,
    ...(bug.suggestedFix === undefined
      ? {}
      : { suggestedFix: bug.suggestedFix }),
    relevantCode: [...(bug.relevantCode ?? [])],
    mustPreserve: [...(bug.mustPreserve ?? [])],
  };
}

function verifiedRuns(
  trace: ValidationTraceReport,
  verification: BugRepairVerification,
): readonly ValidationRunTrace[] {
  if (verification.validationRunIds.length === 0) {
    throw new Error(
      "Bug repair completion requires at least one validation run.",
    );
  }

  const requested = new Set(verification.validationRunIds);
  const runs = trace.runs.filter((run) => requested.has(run.runId));

  if (runs.length !== requested.size) {
    throw new Error(
      "Bug repair completion references an unknown validation run.",
    );
  }

  if (
    runs.some((run) =>
      !run.current ||
      !run.ok ||
      run.evidenceIds.length === 0
    )
  ) {
    throw new Error(
      "Bug repair completion requires current passing validation with evidence.",
    );
  }

  return runs;
}

function verifyPreservationCoverage(
  bug: BugReportV2Bug,
  runs: readonly ValidationRunTrace[],
  trace: ValidationTraceReport,
  verification: BugRepairVerification,
): void {
  if ((bug.mustPreserve?.length ?? 0) === 0) {
    return;
  }

  const invariantIds = [
    ...new Set(verification.preservationInvariantIds ?? []),
  ];
  if (invariantIds.length === 0) {
    throw new Error(
      "Bug repair completion with Must Preserve requirements needs explicit preservation invariant IDs.",
    );
  }

  const selectedRunIds = new Set(runs.map((run) => run.runId));
  for (const invariantId of invariantIds) {
    const invariant = trace.invariants.find(
      (item) => item.invariantId === invariantId,
    );
    if (!invariant || !invariant.current) {
      throw new Error(
        "Must Preserve invariant is not currently validated.",
      );
    }

    const coveredBySelectedRun =
      invariant.currentPassingRunIds.some((runId) =>
        selectedRunIds.has(runId)
      );
    if (!coveredBySelectedRun) {
      throw new Error(
        "Must Preserve invariant is not covered by the selected validation runs.",
      );
    }
  }
}

export function completeVerifiedBugRepair(
  report: BugReportV2,
  verification: BugRepairVerification,
  trace: ValidationTraceReport,
): BugReportV2 {
  const bug = findBug(report, verification.bugId);
  if (bug.fixed) {
    return report;
  }

  const runs = verifiedRuns(trace, verification);
  verifyPreservationCoverage(
    bug,
    runs,
    trace,
    verification,
  );

  return {
    ...report,
    bugs: report.bugs.map((item) =>
      item.id === verification.bugId
        ? { ...item, fixed: true }
        : item
    ),
  };
}
