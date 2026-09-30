import type {
  AuditReportCandidate,
  RejectedReportCandidate,
  ReportCandidateNextEvidenceNeed,
} from "./report-defect-collector.js";
import {
  describeAuditReportCandidate,
} from "./report-defect-collector.js";

const REUSABLE_WITH_UNCHANGED_EVIDENCE = new Set<
  ReportCandidateNextEvidenceNeed
>([
  "intent-grounding",
  "authored-intent",
  "contradiction-proof",
  "runtime-proof",
  "runtime-evidence-integrity",
  "expected-behavior-evidence",
]);

function sameSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return (
    a.length === b.length &&
    a.every((value, index) => value === b[index])
  );
}

export interface ReportCandidateReusePlan {
  readonly reevaluate: readonly AuditReportCandidate[];
  readonly reusedRejected:
    readonly RejectedReportCandidate[];
}

export function planReportCandidateReuse(
  candidates: readonly AuditReportCandidate[],
  previousRejected:
    readonly RejectedReportCandidate[],
): ReportCandidateReusePlan {
  const previous = new Map(
    previousRejected.map((item) => [
      item.route + "|" + item.semanticKey,
      item,
    ]),
  );

  const reevaluate: AuditReportCandidate[] = [];
  const reusedRejected: RejectedReportCandidate[] = [];

  for (const candidate of candidates) {
    const descriptor =
      describeAuditReportCandidate(candidate);
    const prior = previous.get(
      descriptor.route +
        "|" +
        descriptor.semanticKey,
    );

    if (
      prior !== undefined &&
      REUSABLE_WITH_UNCHANGED_EVIDENCE.has(
        prior.nextEvidenceNeed,
      ) &&
      sameSet(
        prior.evidenceIds,
        descriptor.evidenceIds,
      )
    ) {
      reusedRejected.push(prior);
      continue;
    }

    reevaluate.push(candidate);
  }

  return {
    reevaluate,
    reusedRejected,
  };
}
