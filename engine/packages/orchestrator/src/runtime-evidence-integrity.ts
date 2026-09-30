import {
  mergeRuntimeEvidenceRecords,
  type MergedRuntimeEvidence,
} from "../../../analyzers/diagnostics/src/index.js";
import {
  groupRuntimeEvidenceByScope,
  type RuntimeEvidenceIntegrityRequirements,
  type RuntimeEvidenceRecord,
} from "../../project-model/src/index.js";
import type { RuntimeEvidenceIntegrityReport } from "../../project-model/src/index.js";
import type { TelemetryContinuityReport } from "../../project-model/src/index.js";

function targetProfileCounts(
  records: readonly RuntimeEvidenceRecord[],
  expected: string | undefined,
): {
  complete: boolean;
  mismatch: number;
  unbound: number;
} {
  if (!expected) return { complete: true, mismatch: 0, unbound: 0 };

  let mismatch = 0;
  let unbound = 0;
  for (const record of records) {
    if (record.confidence !== "observed") continue;
    if (!record.targetProfileFingerprint) {
      unbound += 1;
    } else if (record.targetProfileFingerprint !== expected) {
      mismatch += 1;
    }
  }

  return {
    complete: mismatch === 0 && unbound === 0,
    mismatch,
    unbound,
  };
}

export function assessRuntimeEvidenceIntegrity(
  records: readonly RuntimeEvidenceRecord[],
  merged: MergedRuntimeEvidence,
  continuity?: TelemetryContinuityReport,
  requirements: RuntimeEvidenceIntegrityRequirements = {},
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
  const minimumObservedRecords = requirements.minimumObservedRecords ?? 1;
  const enoughObservedEvidence = observedRecords >= minimumObservedRecords;
  const target = targetProfileCounts(
    records,
    requirements.expectedTargetProfileFingerprint,
  );
  const telemetryContinuityComplete = continuity?.incomplete !== true;
  const safeForCurrentStateClaims =
    enoughObservedEvidence &&
    unknownConfidenceRecords === 0 &&
    merged.conflicts.length === 0 &&
    target.complete;
  const safeForTemporalViolationClaims =
    safeForCurrentStateClaims &&
    telemetryContinuityComplete &&
    unlocatedObservedRecords === 0;

  const reasons: string[] = [];
  if (!enoughObservedEvidence) {
    reasons.push(
      "Observed runtime evidence is insufficient for the requested claim class.",
    );
  }
  if (unknownConfidenceRecords > 0) {
    reasons.push(
      "Unknown-confidence runtime evidence prevents a closed current-state claim.",
    );
  }
  if (merged.conflicts.length > 0) {
    reasons.push(
      "Unresolved conflicting runtime evidence prevents a reliable current-state claim.",
    );
  }
  if (!target.complete) {
    reasons.push(
      "Runtime evidence is not completely bound to the expected target profile.",
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
    reasons.push(
      "Evidence meets the configured sufficiency, target-binding, conflict, and continuity requirements.",
    );
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
    minimumObservedRecords,
    targetProfileEvidenceComplete: target.complete,
    targetProfileMismatchRecords: target.mismatch,
    targetProfileUnboundRecords: target.unbound,
    reasons,
  };
}

export function assessRuntimeEvidenceSetIntegrity(
  records: readonly RuntimeEvidenceRecord[],
  continuity?: TelemetryContinuityReport,
  requirements: RuntimeEvidenceIntegrityRequirements = {},
): RuntimeEvidenceIntegrityReport {
  const groups = [...groupRuntimeEvidenceByScope({
    schemaVersion: 1,
    records,
  }).values()];

  if (groups.length === 0) {
    return assessRuntimeEvidenceIntegrity(
      [],
      {
        map: {},
        conflicts: [],
        resolvedConflicts: [],
        sourceRefs: [],
        relatedNodeIds: [],
      },
      continuity,
      requirements,
    );
  }

  const reports = groups.map((scopedRecords) =>
    assessRuntimeEvidenceIntegrity(
      scopedRecords,
      mergeRuntimeEvidenceRecords(scopedRecords),
      continuity,
      requirements,
    )
  );

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
    continuityComplete: reports.every(
      (report) => report.continuityComplete,
    ),
    telemetryContinuityComplete: reports.every(
      (report) => report.telemetryContinuityComplete,
    ),
    safeForCurrentStateClaims: reports.every(
      (report) => report.safeForCurrentStateClaims,
    ),
    safeForTemporalViolationClaims: reports.every(
      (report) => report.safeForTemporalViolationClaims,
    ),
    minimumObservedRecords: requirements.minimumObservedRecords ?? 1,
    targetProfileEvidenceComplete: reports.every(
      (report) => report.targetProfileEvidenceComplete !== false,
    ),
    targetProfileMismatchRecords: reports.reduce(
      (sum, report) => sum + (report.targetProfileMismatchRecords ?? 0),
      0,
    ),
    targetProfileUnboundRecords: reports.reduce(
      (sum, report) => sum + (report.targetProfileUnboundRecords ?? 0),
      0,
    ),
    reasons,
  };
}
