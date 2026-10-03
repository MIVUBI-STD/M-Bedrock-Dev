import type {
  GameplayDiscoveryChallengeSignal,
} from "./inspection/gameplay-discovery-challenger.js";
import type {
  SharedResourceOwnershipSignal,
} from "./inspection/shared-resource-ownership.js";
import type {
  AccumulationGrowthSignal,
  CompoundBoundarySignal,
} from "./inspection/gameplay-compound-growth-analysis.js";
import type {
  NeedValidationAuditIssueProjection,
} from "./map-audit-issue-projection.js";

/**
 * @deprecated Blind-spot/risk signals are audit obligations until causal
 * analysis proves a gameplay contradiction. Production uses
 * deriveAuditObligations() instead.
 */
export function projectBlindSpotNeedValidationIssues(
  _input: {
    readonly discoveryChallenges:
      readonly GameplayDiscoveryChallengeSignal[];
    readonly sharedResourceSignals:
      readonly SharedResourceOwnershipSignal[];
    readonly compoundBoundaries?:
      readonly CompoundBoundarySignal[];
    readonly accumulationGrowth?:
      readonly AccumulationGrowthSignal[];
    readonly replicaDivergenceIds?: readonly string[];
  },
): readonly NeedValidationAuditIssueProjection[] {
  return [];
}
