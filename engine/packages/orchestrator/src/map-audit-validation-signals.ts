import type {
  GameplayModelClosureResult,
} from "../../gameplay-intent/src/index.js";
import type {
  NegativeSpaceSignal,
  TemporalInteractionRisk,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  NeedValidationAuditIssueProjection,
} from "./map-audit-issue-projection.js";

/**
 * @deprecated Risk/closure residue is not a gameplay issue by itself.
 * Production uses deriveAuditObligations() instead.
 */
export function projectSignalNeedValidationAuditIssues(
  _negativeSpace: readonly NegativeSpaceSignal[],
  _temporalRisks: readonly TemporalInteractionRisk[],
): readonly NeedValidationAuditIssueProjection[] {
  return [];
}

/**
 * @deprecated Gameplay Model Closure gaps are audit obligations, not BUG
 * findings. Production uses deriveAuditObligations() instead.
 */
export function projectClosureNeedValidationAuditIssues(
  _closure: GameplayModelClosureResult,
): readonly NeedValidationAuditIssueProjection[] {
  return [];
}
