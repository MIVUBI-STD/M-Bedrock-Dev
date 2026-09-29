import type {
  BugImpactAssessment,
  BugPrimaryFailure,
} from "../../bug-report/src/index.js";

export type ReportImpactSignalKind =
  | "progression-blocked"
  | "progression-degraded"
  | "recovery-none"
  | "recovery-abnormal"
  | "crash-or-freeze"
  | "core-mechanic-wrong"
  | "important-state-wrong"
  | "fairness-affected";

export interface ReportImpactSignal {
  readonly kind: ReportImpactSignalKind;
  readonly evidenceIds: readonly string[];
}

export interface ReportPrimaryFailureSignal {
  readonly failure: BugPrimaryFailure;
  readonly evidenceIds: readonly string[];
}

export interface ReportDefectClassificationSignals {
  readonly impact: readonly ReportImpactSignal[];
  readonly primaryFailure:
    readonly ReportPrimaryFailureSignal[];
}

export type DeriveReportDefectClassificationResult =
  | {
      readonly ok: true;
      readonly impact: BugImpactAssessment;
      readonly primaryFailure: BugPrimaryFailure;
      readonly impactEvidenceIds: readonly string[];
      readonly primaryFailureEvidenceIds: readonly string[];
    }
  | {
      readonly ok: false;
      readonly reasons: readonly string[];
    };

function uniqueEvidence(
  signals: readonly {
    readonly evidenceIds: readonly string[];
  }[],
): readonly string[] {
  return [
    ...new Set(
      signals.flatMap((signal) =>
        signal.evidenceIds
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ),
  ].sort();
}

export function deriveReportDefectClassification(
  signals: ReportDefectClassificationSignals,
): DeriveReportDefectClassificationResult {
  const reasons: string[] = [];

  if (signals.impact.length === 0) {
    reasons.push(
      "At least one impact signal is required.",
    );
  }

  const primaryFailures = [
    ...new Set(
      signals.primaryFailure.map(
        (signal) => signal.failure,
      ),
    ),
  ];

  if (primaryFailures.length === 0) {
    reasons.push(
      "At least one primary failure signal is required.",
    );
  } else if (primaryFailures.length > 1) {
    reasons.push(
      "Primary failure signals are ambiguous and must resolve to one failure class.",
    );
  }

  for (const signal of [
    ...signals.impact,
    ...signals.primaryFailure,
  ]) {
    if (signal.evidenceIds.length === 0) {
      reasons.push(
        "Every classification signal requires supporting evidence.",
      );
      break;
    }
  }

  if (reasons.length > 0) {
    return {
      ok: false,
      reasons: [...new Set(reasons)],
    };
  }

  const kinds = new Set(
    signals.impact.map((signal) => signal.kind),
  );

  const impact: BugImpactAssessment = {
    progression:
      kinds.has("progression-blocked")
        ? "blocked"
        : kinds.has("progression-degraded")
          ? "degraded"
          : "unaffected",
    recovery:
      kinds.has("recovery-none")
        ? "none"
        : kinds.has("recovery-abnormal")
          ? "abnormal"
          : "normal",
    stability:
      kinds.has("crash-or-freeze")
        ? "crash-or-freeze"
        : "stable",
    coreMechanic:
      kinds.has("core-mechanic-wrong")
        ? "materially-wrong"
        : "correct",
    importantState:
      kinds.has("important-state-wrong")
        ? "materially-wrong"
        : "correct",
    fairness:
      kinds.has("fairness-affected")
        ? "materially-affected"
        : "unaffected",
  };

  return {
    ok: true,
    impact,
    primaryFailure: primaryFailures[0]!,
    impactEvidenceIds:
      uniqueEvidence(signals.impact),
    primaryFailureEvidenceIds:
      uniqueEvidence(signals.primaryFailure),
  };
}
