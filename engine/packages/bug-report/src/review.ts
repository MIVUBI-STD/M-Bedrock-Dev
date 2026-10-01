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

export function buildBugReportFromApprovedBugSet(
  input: {
    readonly approved: ApprovedBugSet;
    readonly repairBy: BugReportV2RepairBy;
    readonly defects: readonly ConfirmedDefect[];
    readonly groupResolutions?:
      readonly ConfirmedDefectGroupResolution[];
  },
): PromoteConfirmedBugsResult {
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
