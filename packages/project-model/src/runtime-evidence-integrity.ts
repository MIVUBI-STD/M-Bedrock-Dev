export interface RuntimeEvidenceIntegrityReport {
  records: number;
  observedRecords: number;
  derivedRecords: number;
  unknownConfidenceRecords: number;
  unlocatedObservedRecords: number;
  unresolvedConflictPredicates: readonly string[];
  resolvedConflictCount: number;
  telemetryContinuityComplete: boolean;
  safeForCurrentStateClaims: boolean;
  safeForTemporalViolationClaims: boolean;
  reasons: readonly string[];
}
