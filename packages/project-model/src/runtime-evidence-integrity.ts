export interface RuntimeEvidenceIntegrityReport {
  records: number;
  observedRecords: number;
  derivedRecords: number;
  unknownConfidenceRecords: number;
  unlocatedObservedRecords: number;
  unresolvedConflictPredicates: readonly string[];
  resolvedConflictCount: number;
  /** Generic continuity status for the assessed evidence channel. */
  continuityComplete: boolean;
  /** Retained for telemetry-specific compatibility. */
  telemetryContinuityComplete: boolean;
  safeForCurrentStateClaims: boolean;
  safeForTemporalViolationClaims: boolean;
  reasons: readonly string[];
}
