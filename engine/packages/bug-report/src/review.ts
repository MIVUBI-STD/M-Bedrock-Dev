import {
  classifyBugSeverity,
  shouldIncludeInDefaultBugReport,
} from "./decision.js";
import {
  validateConfirmedDefect,
  type ConfirmedDefect,
} from "./confirmed-defect.js";
import {
  buildBugReportFromConfirmedDefects,
} from "./project-confirmed-defect.js";
import type {
  ConfirmedDefectGroupResolution,
} from "./resolve-confirmed-defect-group.js";
import type {
  PromoteConfirmedBugsResult,
} from "./promote-v2.js";
import type {
  BugReportV2Map,
  BugReportV2RepairBy,
} from "./v2.js";
import type {
  BugSeverity,
} from "./vocabulary.js";

export type ProposedBugReviewDecision =
  | "approve"
  | "reject"
  | "needs-discussion";

export interface ProposedBugReviewItem {
  readonly semanticKey: string;
  readonly severity: BugSeverity;
  readonly title: string;
  readonly issue: string;
  readonly expected: string;
  readonly reproduction: readonly string[];
}

export interface ProposedBugSet {
  readonly map: BugReportV2Map;
  readonly items: readonly ProposedBugReviewItem[];
}

export interface ProposedBugDecision {
  readonly semanticKey: string;
  readonly decision: ProposedBugReviewDecision;
  readonly reason?: string;
}

export interface ApprovedBugSet {
  readonly map: BugReportV2Map;
  readonly approvedSemanticKeys: readonly string[];
  readonly rejectedSemanticKeys: readonly string[];
  readonly decisions: readonly ProposedBugDecision[];
}

export type ApplyProposedBugReviewResult =
  | {
      readonly ok: true;
      readonly approved: ApprovedBugSet;
      readonly issues: readonly [];
    }
  | {
      readonly ok: false;
      readonly issues: readonly string[];
    };

export function projectProposedBugSet(
  map: BugReportV2Map,
  defects: readonly ConfirmedDefect[],
): ProposedBugSet {
  const items = defects
    .filter((defect) => {
      if (validateConfirmedDefect(defect).length > 0) {
        return false;
      }
      return shouldIncludeInDefaultBugReport(
        classifyBugSeverity(defect.impact),
      );
    })
    .map((defect) => ({
      semanticKey: defect.semanticKey,
      severity: classifyBugSeverity(defect.impact),
      title: defect.title,
      issue: defect.problem,
      expected: defect.expected.statement,
      reproduction: [...(defect.reproduction ?? [])],
    }))
    .sort((left, right) => {
      const rank: Readonly<Record<BugSeverity, number>> = {
        blocker: 0,
        major: 1,
        minor: 2,
      };
      const severity = rank[left.severity] - rank[right.severity];
      if (severity !== 0) return severity;
      return left.semanticKey.localeCompare(right.semanticKey);
    });

  return {
    map,
    items,
  };
}

export function applyProposedBugReview(
  proposed: ProposedBugSet,
  decisions: readonly ProposedBugDecision[],
): ApplyProposedBugReviewResult {
  const issues: string[] = [];
  const itemKeys = new Set(
    proposed.items.map((item) => item.semanticKey),
  );
  const seen = new Set<string>();

  for (const decision of decisions) {
    if (seen.has(decision.semanticKey)) {
      issues.push(
        "Duplicate review decision for " +
          decision.semanticKey +
          ".",
      );
      continue;
    }
    seen.add(decision.semanticKey);

    if (!itemKeys.has(decision.semanticKey)) {
      issues.push(
        "Review decision does not match a proposed bug: " +
          decision.semanticKey +
          ".",
      );
    }

    if (
      decision.decision !== "approve" &&
      (!decision.reason || decision.reason.trim().length === 0)
    ) {
      issues.push(
        "Rejected or unresolved proposed bugs require a concise reason: " +
          decision.semanticKey +
          ".",
      );
    }
  }

  for (const item of proposed.items) {
    if (!seen.has(item.semanticKey)) {
      issues.push(
        "Proposed bug has no chat review decision: " +
          item.semanticKey +
          ".",
      );
    }
  }

  const unresolved = decisions.filter(
    (decision) =>
      itemKeys.has(decision.semanticKey) &&
      decision.decision === "needs-discussion",
  );
  if (unresolved.length > 0) {
    issues.push(
      "Proposed bug review still contains unresolved discussion items: " +
        unresolved
          .map((item) => item.semanticKey)
          .sort()
          .join(", ") +
        ".",
    );
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    };
  }

  const approvedSemanticKeys = decisions
    .filter((item) => item.decision === "approve")
    .map((item) => item.semanticKey)
    .sort();
  const rejectedSemanticKeys = decisions
    .filter((item) => item.decision === "reject")
    .map((item) => item.semanticKey)
    .sort();

  return {
    ok: true,
    approved: {
      map: proposed.map,
      approvedSemanticKeys,
      rejectedSemanticKeys,
      decisions: [...decisions].sort((left, right) =>
        left.semanticKey.localeCompare(right.semanticKey)
      ),
    },
    issues: [],
  };
}

export function validateApprovedBugSet(
  approved: ApprovedBugSet,
): readonly string[] {
  const issues: string[] = [];
  const approvedKeys = new Set(approved.approvedSemanticKeys);
  const rejectedKeys = new Set(approved.rejectedSemanticKeys);
  const decisions = new Map<string, ProposedBugReviewDecision>();

  if (approvedKeys.size !== approved.approvedSemanticKeys.length) {
    issues.push("Approved semantic keys must be unique.");
  }
  if (rejectedKeys.size !== approved.rejectedSemanticKeys.length) {
    issues.push("Rejected semantic keys must be unique.");
  }

  for (const key of approvedKeys) {
    if (rejectedKeys.has(key)) {
      issues.push(
        "A proposed bug cannot be both approved and rejected: " +
          key +
          ".",
      );
    }
  }

  for (const item of approved.decisions) {
    if (decisions.has(item.semanticKey)) {
      issues.push(
        "Duplicate approved-set decision: " +
          item.semanticKey +
          ".",
      );
      continue;
    }
    decisions.set(item.semanticKey, item.decision);

    if (item.decision === "reject" && (!item.reason || item.reason.trim().length === 0)) {
      issues.push("Rejected approved-set decision requires a reason: " + item.semanticKey + ".");
    }

    if (item.decision === "needs-discussion") {
      issues.push(
        "Approved Bug Set cannot contain unresolved discussion: " +
          item.semanticKey +
          ".",
      );
    }
  }

  for (const key of approvedKeys) {
    if (decisions.get(key) !== "approve") {
      issues.push(
        "Approved semantic key lacks a matching approve decision: " +
          key +
          ".",
      );
    }
  }

  for (const key of rejectedKeys) {
    if (decisions.get(key) !== "reject") {
      issues.push(
        "Rejected semantic key lacks a matching reject decision: " +
          key +
          ".",
      );
    }
  }

  for (const [key, decision] of decisions) {
    if (
      decision === "approve" &&
      !approvedKeys.has(key)
    ) {
      issues.push(
        "Approve decision is missing from approvedSemanticKeys: " +
          key +
          ".",
      );
    }
    if (
      decision === "reject" &&
      !rejectedKeys.has(key)
    ) {
      issues.push(
        "Reject decision is missing from rejectedSemanticKeys: " +
          key +
          ".",
      );
    }
  }

  return issues;
}

export function buildBugReportFromApprovedBugSet(
  input: {
    readonly approved: ApprovedBugSet;
    readonly repairBy: BugReportV2RepairBy;
    readonly defects: readonly ConfirmedDefect[];
    readonly groupResolutions?:
      readonly ConfirmedDefectGroupResolution[];
  },
): PromoteConfirmedBugsResult {
  const approvalIssues =
    validateApprovedBugSet(input.approved);
  if (approvalIssues.length > 0) {
    return {
      ok: false,
      issues: approvalIssues.map((message) => ({
        code: "invalid-confirmed-defect" as const,
        message,
      })),
    };
  }

  const approvedKeys = new Set(
    input.approved.approvedSemanticKeys,
  );
  const defectByKey = new Map(
    input.defects.map((defect) => [
      defect.semanticKey,
      defect,
    ]),
  );

  const missing = [...approvedKeys].filter(
    (key) => !defectByKey.has(key),
  );
  if (missing.length > 0) {
    return {
      ok: false,
      issues: missing.map((key) => ({
        code: "invalid-confirmed-defect" as const,
        message:
          "Approved proposed bug no longer exists in current confirmed defects: " +
          key +
          ".",
      })),
    };
  }

  const defects = input.approved.approvedSemanticKeys
    .map((key) => defectByKey.get(key)!)
    .filter(Boolean);

  if (defects.length === 0) {
    return {
      ok: false,
      issues: [{
        code: "no-confirmed-bugs",
        message:
          "No approved gameplay bugs remain after chat review; do not generate a bug-report artifact.",
      }],
    };
  }

  return buildBugReportFromConfirmedDefects({
    map: input.approved.map,
    repairBy: input.repairBy,
    defects,
    ...(input.groupResolutions === undefined
      ? {}
      : { groupResolutions: input.groupResolutions }),
  });
}
