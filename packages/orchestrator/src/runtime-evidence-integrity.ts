import {
  mergeRuntimeEvidenceRecords,
  type MergedRuntimeEvidence,
} from "../../../analyzers/diagnostics/src/runtime-evidence-merge.js";
import {
  groupRuntimeEvidenceByScope,
  type RuntimeEvidenceRecord,
} from "../../project-model/src/runtime-evidence.js";
import type { RuntimeEvidenceIntegrityReport } from "../../project-model/src/runtime-evidence-integrity.js";
import type { TelemetryContinuityReport } from "../../project-model/src/telemetry-continuity.js";

export function assessRuntimeEvidenceIntegrity(
  records: readonly RuntimeEvidenceRecord[],
  merged: MergedRuntimeEvidence,
  continuity?: TelemetryContinuityReport,
): RuntimeEvidenceIntegrityReport {
  const observedRecords = records.filter(
    (record) => record.confidence === "observed",
  ).length;
  const derivedRecords = records.filter(
    (record) => record.confidence === "derived",
  ).length;
  const unknownConfidenceRecords = records.filter(
    (record) => record.confidence === "unknown",
  ).length;
  const unlocatedObservedRecords = records.filter(
    (record) =>
      record.confidence === "observed" &&
      record.observedAt === undefined,
  ).length;
  const telemetryContinuityComplete = continuity?.incomplete !== true;
  const safeForCurrentStateClaims = merged.conflicts.length === 0;
  const safeForTemporalViolationClaims =
    safeForCurrentStateClaims &&
    telemetryContinuityComplete &&
    unlocatedObservedRecords === 0;

  const reasons: string[] = [];
  if (merged.conflicts.length > 0) {
    reasons.push(
      "Unresolved conflicting runtime evidence prevents a reliable current-state claim.",
    );
  }
  if (!telemetryContinuityComplete) {
    reasons.push(
      "Telemetry continuity is incomplete; missing observations cannot prove temporal absence or order violations.",
    );
  }
  if (unlocatedObservedRecords > 0) {
    reasons.push(
      "Observed runtime evidence without an observation point cannot participate safely in temporal claims.",
    );
  }
  if (reasons.length === 0) {
    reasons.push("No evidence-integrity blocker is detected for the assessed claim classes.");
  }

  return {
    records: records.length,
    observedRecords,
    derivedRecords,
    unknownConfidenceRecords,
    unlocatedObservedRecords,
    unresolvedConflictPredicates: [...merged.conflicts],
    resolvedConflictCount: merged.resolvedConflicts.length,
    continuityComplete: telemetryContinuityComplete,
    telemetryContinuityComplete,
    safeForCurrentStateClaims,
    safeForTemporalViolationClaims,
    reasons,
  };
}


export function assessRuntimeEvidenceSetIntegrity(
  records: readonly RuntimeEvidenceRecord[],
  continuity?: TelemetryContinuityReport,
): RuntimeEvidenceIntegrityReport {
  const reports = [...groupRuntimeEvidenceByScope({
    schemaVersion: 1,
    records,
  }).values()].map((scopedRecords) =>
    assessRuntimeEvidenceIntegrity(
      scopedRecords,
      mergeRuntimeEvidenceRecords(scopedRecords),
      continuity,
    )
  );

  if (reports.length === 0) {
    return {
      records: 0,
      observedRecords: 0,
      derivedRecords: 0,
      unknownConfidenceRecords: 0,
      unlocatedObservedRecords: 0,
      unresolvedConflictPredicates: [],
      resolvedConflictCount: 0,
      continuityComplete: continuity?.incomplete !== true,
      telemetryContinuityComplete: continuity?.incomplete !== true,
      safeForCurrentStateClaims: true,
      safeForTemporalViolationClaims: continuity?.incomplete !== true,
      reasons: continuity?.incomplete === true
        ? [
            "Telemetry continuity is incomplete; no temporal claim should rely on absence/order from this channel.",
          ]
        : [
            "No evidence-integrity blocker is detected for the assessed claim classes.",
          ],
    };
  }

  const unresolvedConflictPredicates = [...new Set(
    reports.flatMap((report) => report.unresolvedConflictPredicates),
  )].sort();
  const reasons = [...new Set(
    reports.flatMap((report) => report.reasons),
  )];

  return {
    records: reports.reduce((sum, report) => sum + report.records, 0),
    observedRecords: reports.reduce(
      (sum, report) => sum + report.observedRecords,
      0,
    ),
    derivedRecords: reports.reduce(
      (sum, report) => sum + report.derivedRecords,
      0,
    ),
    unknownConfidenceRecords: reports.reduce(
      (sum, report) => sum + report.unknownConfidenceRecords,
      0,
    ),
    unlocatedObservedRecords: reports.reduce(
      (sum, report) => sum + report.unlocatedObservedRecords,
      0,
    ),
    unresolvedConflictPredicates,
    resolvedConflictCount: reports.reduce(
      (sum, report) => sum + report.resolvedConflictCount,
      0,
    ),
    continuityComplete: continuity?.incomplete !== true,
    telemetryContinuityComplete: continuity?.incomplete !== true,
    safeForCurrentStateClaims: reports.every(
      (report) => report.safeForCurrentStateClaims,
    ),
    safeForTemporalViolationClaims: reports.every(
      (report) => report.safeForTemporalViolationClaims,
    ),
    reasons,
  };
}
