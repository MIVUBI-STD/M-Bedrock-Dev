import type {
  RuntimeEvidenceRecord,
  RuntimeObservationPoint,
} from "../../project-model/src/index.js";
import { runtimeScopeContains } from "../../project-model/src/index.js";
import type {
  RuntimeTemporalAssessment,
  RuntimeTemporalRequirement,
} from "../../project-model/src/index.js";

type Order = "before" | "same" | "after" | "unresolved";

function compareObservation(
  left: RuntimeObservationPoint | undefined,
  right: RuntimeObservationPoint | undefined,
): Order {
  if (!left || !right) return "unresolved";

  if (
    left.streamId !== undefined &&
    right.streamId !== undefined &&
    left.streamId === right.streamId &&
    left.sequence !== undefined &&
    right.sequence !== undefined
  ) {
    if (left.sequence < right.sequence) return "before";
    if (left.sequence > right.sequence) return "after";
    return "same";
  }

  if (left.tick !== undefined && right.tick !== undefined) {
    if (left.tick < right.tick) return "before";
    if (left.tick > right.tick) return "after";
    return "same";
  }

  if (left.timestamp !== undefined && right.timestamp !== undefined) {
    const a = Date.parse(left.timestamp);
    const b = Date.parse(right.timestamp);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      if (a < b) return "before";
      if (a > b) return "after";
      return "same";
    }
  }

  return "unresolved";
}

function presentMatches(
  records: readonly RuntimeEvidenceRecord[],
  predicate: string,
  requirement: RuntimeTemporalRequirement,
): RuntimeEvidenceRecord[] {
  return records.filter((record) =>
    record.predicate === predicate &&
    record.state === "present" &&
    runtimeScopeContains(record.scope, requirement.scope)
  );
}

function satisfiesTickDelta(
  before: RuntimeEvidenceRecord,
  after: RuntimeEvidenceRecord,
  maxTickDelta: number | undefined,
): boolean {
  if (maxTickDelta === undefined) return true;
  const a = before.observedAt?.tick;
  const b = after.observedAt?.tick;
  return a !== undefined && b !== undefined && b - a <= maxTickDelta;
}

export function assessRuntimeTemporalRequirement(
  records: readonly RuntimeEvidenceRecord[],
  requirement: RuntimeTemporalRequirement,
  continuityComplete = true,
): RuntimeTemporalAssessment {
  const before = presentMatches(
    records,
    requirement.beforePredicate,
    requirement,
  );
  const after = presentMatches(
    records,
    requirement.afterPredicate,
    requirement,
  );

  for (const afterRecord of after) {
    for (const beforeRecord of before) {
      const order = compareObservation(
        beforeRecord.observedAt,
        afterRecord.observedAt,
      );
      if (
        (order === "before" || order === "same") &&
        satisfiesTickDelta(
          beforeRecord,
          afterRecord,
          requirement.maxTickDelta,
        )
      ) {
        return {
          requirementId: requirement.id,
          status: "satisfied",
          beforePredicate: requirement.beforePredicate,
          afterPredicate: requirement.afterPredicate,
          before: beforeRecord,
          after: afterRecord,
          reason:
            "Observed prerequisite precedes the dependent observation in a comparable runtime timeline.",
        };
      }
    }
  }

  if (!continuityComplete) {
    return {
      requirementId: requirement.id,
      status: "evidence-incomplete",
      beforePredicate: requirement.beforePredicate,
      afterPredicate: requirement.afterPredicate,
      reason:
        "Telemetry continuity is incomplete, so missing or reversed evidence cannot prove a temporal violation.",
    };
  }

  if (after.length > 0 && before.length === 0) {
    return {
      requirementId: requirement.id,
      status: "missing-before",
      beforePredicate: requirement.beforePredicate,
      afterPredicate: requirement.afterPredicate,
      ...(after[0] === undefined ? {} : { after: after[0] }),
      reason:
        "The dependent observation is present, but the required prerequisite observation is absent from a complete evidence stream.",
    };
  }

  if (before.length > 0 && after.length === 0) {
    return {
      requirementId: requirement.id,
      status: "missing-after",
      beforePredicate: requirement.beforePredicate,
      afterPredicate: requirement.afterPredicate,
      ...(before[0] === undefined ? {} : { before: before[0] }),
      reason:
        "The prerequisite is observed, but the expected dependent observation is absent from a complete evidence stream.",
    };
  }

  let unresolved = false;
  for (const beforeRecord of before) {
    for (const afterRecord of after) {
      const order = compareObservation(
        beforeRecord.observedAt,
        afterRecord.observedAt,
      );
      if (order === "unresolved") unresolved = true;
      if (order === "after") {
        return {
          requirementId: requirement.id,
          status: "violated-order",
          beforePredicate: requirement.beforePredicate,
          afterPredicate: requirement.afterPredicate,
          before: beforeRecord,
          after: afterRecord,
          reason:
            "The prerequisite is observed only after the dependent observation.",
        };
      }
    }
  }

  return {
    requirementId: requirement.id,
    status: unresolved ? "unresolved-order" : "missing-after",
    beforePredicate: requirement.beforePredicate,
    afterPredicate: requirement.afterPredicate,
    ...(before[0] ? { before: before[0] } : {}),
    ...(after[0] ? { after: after[0] } : {}),
    reason: unresolved
      ? "Evidence exists but cannot be placed on one comparable runtime timeline."
      : "The temporal requirement is not satisfied by the available complete evidence.",
  };
}

export function assessRuntimeTemporalRequirements(
  records: readonly RuntimeEvidenceRecord[],
  requirements: readonly RuntimeTemporalRequirement[],
  continuityComplete = true,
): RuntimeTemporalAssessment[] {
  return requirements
    .map((requirement) =>
      assessRuntimeTemporalRequirement(
        records,
        requirement,
        continuityComplete,
      )
    )
    .sort((a, b) => a.requirementId.localeCompare(b.requirementId));
}
