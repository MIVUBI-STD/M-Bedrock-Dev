import type {
  PreservationVerificationReceipt,
} from "../../preservation/src/index.js";
import type {
  ValidationTraceReport,
} from "../../validation/src/index.js";
import {
  parseBugReportV2,
  type BugReportV2,
} from "./v2.js";

export type BugRetestOutcome = "passed" | "failed";

export type BugCompletionIssueCode =
  | "bug-not-found"
  | "map-name-mismatch"
  | "map-version-mismatch"
  | "tested-version-mismatch"
  | "missing-retest-evidence"
  | "missing-required-invariant"
  | "validation-not-current"
  | "validation-failed"
  | "validation-proof-insufficient"
  | "validation-missing-evidence"
  | "missing-preservation-proof"
  | "preservation-failed"
  | "preservation-invariant-unverified"
  | "invalid-updated-report";

export interface BugCompletionIssue {
  readonly code: BugCompletionIssueCode;
  readonly message: string;
}

export interface VerifiedBugRetestInput {
  readonly report: BugReportV2;
  readonly bugId: string;
  readonly mapName: string;
  readonly mapVersion: string;
  readonly testedVersion: string;
  readonly outcome: BugRetestOutcome;
  readonly evidenceIds: readonly string[];
  readonly requiredInvariantIds?: readonly string[];
  readonly validationTrace?: ValidationTraceReport;
  readonly preservationInvariantIds?: readonly string[];
  readonly preservationReceipt?: PreservationVerificationReceipt;
}

export type VerifiedBugRetestResult =
  | {
      readonly ok: true;
      readonly report: BugReportV2;
      readonly changed: boolean;
      readonly issues: readonly [];
    }
  | {
      readonly ok: false;
      readonly issues: readonly BugCompletionIssue[];
    };

function nonEmpty(values: readonly string[] | undefined): readonly string[] {
  return (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
}

export function applyVerifiedBugRetest(
  input: VerifiedBugRetestInput,
): VerifiedBugRetestResult {
  const issues: BugCompletionIssue[] = [];
  const bug = input.report.bugs.find(
    (candidate) => candidate.id === input.bugId,
  );

  if (!bug) {
    issues.push({
      code: "bug-not-found",
      message: "Bug ID is not present in the canonical report.",
    });
  }

  if (input.report.map.name !== input.mapName) {
    issues.push({
      code: "map-name-mismatch",
      message: "Retest evidence belongs to another map.",
    });
  }

  if (input.report.map.mapVersion !== input.mapVersion) {
    issues.push({
      code: "map-version-mismatch",
      message:
        "Retest evidence must target the canonical report map version.",
    });
  }

  if (input.report.map.testedVersion !== input.testedVersion) {
    issues.push({
      code: "tested-version-mismatch",
      message:
        "Retest evidence must target the exact canonical tested runtime version.",
    });
  }

  const evidenceIds = nonEmpty(input.evidenceIds);
  if (evidenceIds.length === 0) {
    issues.push({
      code: "missing-retest-evidence",
      message: "Retest outcome requires explicit evidence IDs.",
    });
  }

  if (issues.length > 0 || !bug) {
    return { ok: false, issues };
  }

  if (input.outcome === "passed") {
    const requiredInvariantIds = nonEmpty(
      input.requiredInvariantIds,
    );

    if (requiredInvariantIds.length === 0) {
      issues.push({
        code: "missing-required-invariant",
        message:
          "Verified completion requires at least one defect-fixing invariant.",
      });
    }

    if (!input.validationTrace) {
      issues.push({
        code: "validation-not-current",
        message:
          "Verified completion requires a current validation trace.",
      });
    } else {
      const runById = new Map(
        input.validationTrace.runs.map(
          (run) => [run.runId, run] as const,
        ),
      );

      for (const invariantId of requiredInvariantIds) {
        const invariant = input.validationTrace.invariants.find(
          (candidate) => candidate.invariantId === invariantId,
        );

        if (!invariant || invariant.currentPassingRunIds.length === 0) {
          issues.push({
            code: "validation-not-current",
            message:
              "No current passing validation run proves invariant: " +
              invariantId +
              ".",
          });
          continue;
        }

        const provingRuns = invariant.currentPassingRunIds
          .map((runId) => runById.get(runId))
          .filter((run) => run !== undefined);

        if (provingRuns.some((run) => !run.current)) {
          issues.push({
            code: "validation-not-current",
            message:
              "Validation evidence is stale for invariant: " +
              invariantId +
              ".",
          });
        }
        if (provingRuns.some((run) => !run.ok)) {
          issues.push({
            code: "validation-failed",
            message:
              "Validation run failed for invariant: " +
              invariantId +
              ".",
          });
        }
        if (provingRuns.some((run) => !run.proofSufficient)) {
          issues.push({
            code: "validation-proof-insufficient",
            message:
              "Validation proof level is insufficient for invariant: " +
              invariantId +
              ".",
          });
        }
        if (
          provingRuns.length === 0 ||
          provingRuns.every((run) => run.evidenceIds.length === 0)
        ) {
          issues.push({
            code: "validation-missing-evidence",
            message:
              "Current validation has no evidence IDs for invariant: " +
              invariantId +
              ".",
          });
        }
      }
    }

    const bugNeedsPreservation =
      (bug.mustPreserve?.length ?? 0) > 0;

    if (bugNeedsPreservation) {
      const preservationInvariantIds = nonEmpty(
        input.preservationInvariantIds,
      );
      const receipt = input.preservationReceipt;

      if (
        preservationInvariantIds.length === 0 ||
        !receipt
      ) {
        issues.push({
          code: "missing-preservation-proof",
          message:
            "Bug has Must Preserve requirements; verified completion requires explicit preservation invariants and a preservation receipt.",
        });
      } else if (!receipt.passed) {
        issues.push({
          code: "preservation-failed",
          message:
            "Preservation verification did not pass.",
        });
      } else {
        const verified = new Set(
          receipt.verifiedMustPreserveInvariantIds,
        );
        for (const invariantId of preservationInvariantIds) {
          if (!verified.has(invariantId)) {
            issues.push({
              code: "preservation-invariant-unverified",
              message:
                "Preservation receipt does not verify invariant: " +
                invariantId +
                ".",
            });
          }
        }
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const nextFixed = input.outcome === "passed";
  const changed = bug.fixed !== nextFixed;
  const candidate: BugReportV2 = {
    ...input.report,
    bugs: input.report.bugs.map((item) =>
      item.id === input.bugId
        ? { ...item, fixed: nextFixed }
        : item
    ),
  };

  const parsed = parseBugReportV2(candidate);
  if (!parsed.ok) {
    return {
      ok: false,
      issues: [{
        code: "invalid-updated-report",
        message:
          "Verified retest produced an invalid canonical report: " +
          parsed.issues
            .map((issue) => issue.path + ": " + issue.message)
            .join("; "),
      }],
    };
  }

  return {
    ok: true,
    report: parsed.report,
    changed,
    issues: [],
  };
}
