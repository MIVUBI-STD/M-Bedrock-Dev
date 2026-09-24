import type { MergedRuntimeEvidence } from "../../../analyzers/diagnostics/src/runtime-evidence-merge.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
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
    telemetryContinuityComplete,
    safeForCurrentStateClaims,
    safeForTemporalViolationClaims,
    reasons,
  };
}
