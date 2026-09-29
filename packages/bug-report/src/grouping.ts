export interface BugGroupingAssessment {
  readonly sameCausalDefect: boolean;
  readonly sameBrokenInvariant: boolean;
  readonly sameRepairUnit: boolean;
}

export type BugGroupingDecision = "merge" | "split";

export function decideBugGrouping(
  assessment: BugGroupingAssessment,
): BugGroupingDecision {
  return (
    assessment.sameCausalDefect &&
    assessment.sameBrokenInvariant &&
    assessment.sameRepairUnit
  )
    ? "merge"
    : "split";
}
