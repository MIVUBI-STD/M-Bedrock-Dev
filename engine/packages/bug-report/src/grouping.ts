import type {
  ConfirmedDefect,
} from "./confirmed-defect.js";

export interface BugGroupingAssessment {
  /**
   * Causal-link ids describe manifestations, not the root-cause key.
   * They are retained for traceability but do not have to be identical.
   */
  readonly relatedCausalLineage: boolean;
  readonly sameBrokenInvariant: boolean;
  readonly sameRepairUnit: boolean;
  readonly samePrimaryFailure: boolean;
}

export type BugGroupingDecision = "merge" | "split";

export function decideBugGrouping(
  assessment: BugGroupingAssessment,
): BugGroupingDecision {
  return (
    assessment.sameBrokenInvariant &&
    assessment.sameRepairUnit &&
    assessment.samePrimaryFailure
  )
    ? "merge"
    : "split";
}


function causalIds(
  defect: ConfirmedDefect,
): readonly string[] {
  return [
    ...new Set([
      ...(defect.causalIncidentIds ?? []),
      ...(defect.causalIncidentId === undefined
        ? []
        : [defect.causalIncidentId]),
    ]),
  ].sort();
}

function overlaps(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const set = new Set(left);
  return right.some((item) => set.has(item));
}

function sameSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length === 0 || right.length === 0) return false;
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return (
    a.length === b.length &&
    a.every((value, index) => value === b[index])
  );
}

export function assessConfirmedDefectGrouping(
  left: ConfirmedDefect,
  right: ConfirmedDefect,
): BugGroupingAssessment {
  const leftCausal = causalIds(left);
  const rightCausal = causalIds(right);
  return {
    relatedCausalLineage:
      leftCausal.length > 0 &&
      rightCausal.length > 0 &&
      overlaps(leftCausal, rightCausal),
    sameBrokenInvariant: sameSet(
      left.brokenInvariantIds,
      right.brokenInvariantIds,
    ),
    sameRepairUnit: sameSet(
      left.repairUnitIds,
      right.repairUnitIds,
    ),
    samePrimaryFailure:
      left.primaryFailure === right.primaryFailure,
  };
}

export interface ConfirmedDefectGroup {
  readonly key: string;
  readonly defects: readonly ConfirmedDefect[];
}

export function groupConfirmedDefects(
  defects: readonly ConfirmedDefect[],
): readonly ConfirmedDefectGroup[] {
  const grouped = new Map<string, ConfirmedDefect[]>();

  for (const defect of defects) {
    const key =
      defect.brokenInvariantIds.length === 0 ||
      defect.repairUnitIds.length === 0
        ? "single:" + defect.semanticKey
        : [
            "failure:" + defect.primaryFailure,
            "invariants:" +
              [...new Set(defect.brokenInvariantIds)].sort().join(","),
            "repair-units:" +
              [...new Set(defect.repairUnitIds)].sort().join(","),
          ].join("|");

    const list = grouped.get(key) ?? [];
    list.push(defect);
    grouped.set(key, list);
  }

  return [...grouped.entries()]
    .map(([key, items]) => ({
      key,
      defects: [...items].sort((a, b) =>
        a.semanticKey.localeCompare(b.semanticKey)
      ),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
