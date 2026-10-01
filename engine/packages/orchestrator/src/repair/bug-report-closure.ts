import type {
  BugReportV2,
  BugReportV2RepairBy,
} from "../../../bug-report/src/index.js";
import {
  selectBugRepairTarget,
} from "../../../repair/src/index.js";
import type {
  PreservationVerificationReceipt,
} from "../../../preservation/src/index.js";
import type {
  PostRepairClosureReceipt,
} from "./post-repair-closure.js";

export interface ClosedRepairReportCompletionInput {
  readonly report: BugReportV2;
  readonly bugId: string;
  readonly repairBy: BugReportV2RepairBy;
  readonly closure: PostRepairClosureReceipt;
  readonly preservation: PreservationVerificationReceipt;
}

export function completeBugReportFromClosedRepair(
  input: ClosedRepairReportCompletionInput,
): BugReportV2 {
  const target = selectBugRepairTarget(
    input.report,
    input.bugId,
    input.repairBy,
  );

  if (
    input.closure.disposition !== "fixed" ||
    input.closure.evidenceIds.length === 0
  ) {
    throw new Error(
      "Bug report completion requires a fixed post-repair closure with evidence.",
    );
  }

  if (
    input.preservation.transactionId !==
      input.closure.transactionId ||
    input.preservation.passed !== true ||
    input.preservation.evidenceIds.length === 0
  ) {
    throw new Error(
      "Bug report completion requires matching passed preservation proof.",
    );
  }

  if (
    target.mustPreserve.length > 0 &&
    input.preservation
      .verifiedMustPreserveInvariantIds
      .length === 0
  ) {
    throw new Error(
      "Bug report completion requires verified Must Preserve invariants.",
    );
  }

  const closureEvidence = new Set(
    input.closure.evidenceIds,
  );
  if (
    input.preservation.evidenceIds.some(
      (id) => !closureEvidence.has(id),
    )
  ) {
    throw new Error(
      "Preservation evidence is not included in the post-repair closure receipt.",
    );
  }

  return {
    ...input.report,
    bugs: input.report.bugs.map((bug) =>
      bug.id === input.bugId
        ? { ...bug, fixed: true }
        : bug
    ),
  };
}
