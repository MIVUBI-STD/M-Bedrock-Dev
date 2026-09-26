export interface RuntimeEvidenceIntegrityRequirements {
  minimumObservedRecords?: number;
  expectedTargetProfileFingerprint?: string;
}

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
  minimumObservedRecords?: number;
  targetProfileEvidenceComplete?: boolean;
  targetProfileMismatchRecords?: number;
  targetProfileUnboundRecords?: number;
  reasons: readonly string[];
}
