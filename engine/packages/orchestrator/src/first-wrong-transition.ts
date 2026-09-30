import type {
  RuntimeFirstWrongCandidate,
  RuntimeFirstWrongTransition,
} from "../../project-model/src/index.js";
import type { RuntimeObservationPoint } from "../../project-model/src/index.js";
import type { RuntimeTemporalAssessment } from "../../project-model/src/index.js";

type Order = "before" | "same" | "after" | "unresolved";

function comparePoint(
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

function wrongCandidate(
  assessment: RuntimeTemporalAssessment,
): RuntimeFirstWrongCandidate | undefined {
  if (
    assessment.status !== "violated-order" &&
    assessment.status !== "missing-before"
  ) {
    return undefined;
  }

  return {
    requirementId: assessment.requirementId,
    predicate: assessment.afterPredicate,
    status: assessment.status,
    ...(assessment.after?.observedAt === undefined
      ? {}
      : { detectedAt: assessment.after.observedAt }),
    reason: assessment.reason,
  };
}

export function identifyFirstWrongTransition(
  assessments: readonly RuntimeTemporalAssessment[],
): RuntimeFirstWrongTransition {
  const candidates = assessments
    .map(wrongCandidate)
    .filter((item): item is RuntimeFirstWrongCandidate => item !== undefined);

  if (candidates.length === 0) {
    return {
      status: "not-observed",
      competingCandidates: [],
      reason:
        "No temporally grounded violated-order or missing-before transition is observed.",
    };
  }

  let earliest = candidates[0]!;
  const incomparable: RuntimeFirstWrongCandidate[] = [];

  for (const candidate of candidates.slice(1)) {
    const order = comparePoint(candidate.detectedAt, earliest.detectedAt);
    if (order === "before") {
      earliest = candidate;
      continue;
    }
    if (order === "unresolved") {
      incomparable.push(candidate);
    }
  }

  const competing = candidates.filter((candidate) => {
    if (candidate === earliest) return false;
    const order = comparePoint(candidate.detectedAt, earliest.detectedAt);
    return order === "same" || order === "unresolved";
  });

  if (incomparable.length > 0 || competing.length > 0) {
    return {
      status: "ambiguous",
      competingCandidates: [earliest, ...competing],
      reason:
        "Multiple wrong transitions cannot be totally ordered on one comparable runtime timeline.",
    };
  }

  return {
    status: "identified",
    candidate: earliest,
    competingCandidates: [],
    reason:
      "This is the earliest comparable observed transition that violates a declared temporal requirement.",
  };
}
