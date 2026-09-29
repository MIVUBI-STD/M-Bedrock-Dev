import type {
  ConfirmedDefect,
} from "./confirmed-defect.js";

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
  return {
    sameCausalDefect:
      left.causalIncidentId !== undefined &&
      right.causalIncidentId !== undefined &&
      left.causalIncidentId === right.causalIncidentId,
    sameBrokenInvariant: sameSet(
      left.brokenInvariantIds,
      right.brokenInvariantIds,
    ),
    sameRepairUnit: sameSet(
      left.repairUnitIds,
      right.repairUnitIds,
    ),
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
      defect.causalIncidentId === undefined
        ? "single:" + defect.semanticKey
        : [
            "incident:" + defect.causalIncidentId,
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
