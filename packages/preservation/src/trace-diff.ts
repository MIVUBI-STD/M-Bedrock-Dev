import type {
  BehaviorScalar,
} from "../../behavior-model/src/index.js";

export interface PreservationTraceFrame {
  checkpointId: string;
  occurrence: number;
  tick?: number;
  values: Readonly<Record<string, BehaviorScalar>>;
}

export interface PreservationSemanticTrace {
  schemaVersion: 1;
  complete: boolean;
  frames: readonly PreservationTraceFrame[];
}

export interface PreservationTraceEquivalencePolicy {
  schemaVersion: 1;
  id: string;
  requiredCheckpointIds: readonly string[];
  mustPreserveStateKeys: readonly string[];
  mustChangeStateKeys?: readonly string[];
  allowedChangeStateKeys?: readonly string[];
  timingToleranceTicks?: number;
}

export type PreservationTraceDisposition =
  | "equivalent"
  | "changed-as-intended"
  | "violated"
  | "unknown";

export interface PreservationTraceDelta {
  checkpointId: string;
  occurrence: number;
  stateKey: string;
  before: BehaviorScalar | undefined;
  after: BehaviorScalar | undefined;
  classification:
    | "must-preserve"
    | "must-change"
    | "allowed-change"
    | "unexpected";
}

export interface PreservationTimingDelta {
  checkpointId: string;
  occurrence: number;
  beforeTick: number;
  afterTick: number;
  driftTicks: number;
  exceedsTolerance: boolean;
}

export interface PreservationTraceComparison {
  policyId: string;
  disposition: PreservationTraceDisposition;
  missingCheckpointInstances: readonly string[];
  stateDeltas: readonly PreservationTraceDelta[];
  timingDeltas: readonly PreservationTimingDelta[];
  unchangedMustChangeStateKeys: readonly string[];
  reasons: readonly string[];
}

function frameKey(
  frame: Pick<
    PreservationTraceFrame,
    "checkpointId" | "occurrence"
  >,
): string {
  return (
    frame.checkpointId +
    "#" +
    frame.occurrence
  );
}

function duplicateFrameKeys(
  trace: PreservationSemanticTrace,
): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const frame of trace.frames) {
    const key = frameKey(frame);
    if (seen.has(key)) {
      duplicates.add(key);
    }
    seen.add(key);
  }
  return [...duplicates].sort();
}

export function validatePreservationSemanticTrace(
  trace: PreservationSemanticTrace,
): string[] {
  const errors: string[] = [];

  if (trace.schemaVersion !== 1) {
    errors.push(
      "Preservation semantic trace schemaVersion must be 1.",
    );
  }

  for (const duplicate of duplicateFrameKeys(trace)) {
    errors.push(
      "Duplicate semantic trace checkpoint instance: " +
        duplicate +
        ".",
    );
  }

  for (const frame of trace.frames) {
    if (!frame.checkpointId.trim()) {
      errors.push(
        "Semantic trace checkpointId must be non-empty.",
      );
    }
    if (
      !Number.isInteger(frame.occurrence) ||
      frame.occurrence < 0
    ) {
      errors.push(
        "Semantic trace occurrence must be a non-negative integer.",
      );
    }
    if (
      frame.tick !== undefined &&
      (
        !Number.isInteger(frame.tick) ||
        frame.tick < 0
      )
    ) {
      errors.push(
        "Semantic trace tick must be a non-negative integer when provided.",
      );
    }
  }

  return errors;
}

export function validatePreservationTraceEquivalencePolicy(
  policy: PreservationTraceEquivalencePolicy,
): string[] {
  const errors: string[] = [];

  if (policy.schemaVersion !== 1) {
    errors.push(
      "Preservation trace policy schemaVersion must be 1.",
    );
  }
  if (!policy.id.trim()) {
    errors.push(
      "Preservation trace policy id must be non-empty.",
    );
  }
  if (
    policy.timingToleranceTicks !== undefined &&
    (
      !Number.isInteger(
        policy.timingToleranceTicks,
      ) ||
      policy.timingToleranceTicks < 0
    )
  ) {
    errors.push(
      "Preservation trace timingToleranceTicks must be a non-negative integer.",
    );
  }

  const preserve = new Set(
    policy.mustPreserveStateKeys,
  );
  for (
    const key of
      policy.mustChangeStateKeys ?? []
  ) {
    if (preserve.has(key)) {
      errors.push(
        "State key cannot be both must-preserve and must-change: " +
          key +
          ".",
      );
    }
  }

  return errors;
}

function checkpointInstances(
  trace: PreservationSemanticTrace,
  requiredIds: ReadonlySet<string>,
): Map<string, PreservationTraceFrame> {
  const frames = new Map<
    string,
    PreservationTraceFrame
  >();
  for (const frame of trace.frames) {
    if (
      requiredIds.has(frame.checkpointId)
    ) {
      frames.set(frameKey(frame), frame);
    }
  }
  return frames;
}

function classifyKey(
  key: string,
  policy: PreservationTraceEquivalencePolicy,
): PreservationTraceDelta["classification"] {
  if (
    policy.mustPreserveStateKeys.includes(key)
  ) {
    return "must-preserve";
  }
  if (
    policy.mustChangeStateKeys?.includes(key)
  ) {
    return "must-change";
  }
  if (
    policy.allowedChangeStateKeys?.includes(key)
  ) {
    return "allowed-change";
  }
  return "unexpected";
}

export function comparePreservationSemanticTraces(
  before: PreservationSemanticTrace,
  after: PreservationSemanticTrace,
  policy: PreservationTraceEquivalencePolicy,
): PreservationTraceComparison {
  const validationErrors = [
    ...validatePreservationSemanticTrace(before)
      .map((error) => "before: " + error),
    ...validatePreservationSemanticTrace(after)
      .map((error) => "after: " + error),
    ...validatePreservationTraceEquivalencePolicy(
      policy,
    ).map((error) => "policy: " + error),
  ];

  if (validationErrors.length > 0) {
    return {
      policyId: policy.id,
      disposition: "unknown",
      missingCheckpointInstances: [],
      stateDeltas: [],
      timingDeltas: [],
      unchangedMustChangeStateKeys:
        policy.mustChangeStateKeys ?? [],
      reasons: validationErrors,
    };
  }

  const requiredIds = new Set(
    policy.requiredCheckpointIds,
  );
  const beforeFrames = checkpointInstances(
    before,
    requiredIds,
  );
  const afterFrames = checkpointInstances(
    after,
    requiredIds,
  );

  const instanceKeys = new Set([
    ...beforeFrames.keys(),
    ...afterFrames.keys(),
  ]);
  const missing: string[] = [];
  const stateDeltas: PreservationTraceDelta[] = [];
  const timingDeltas: PreservationTimingDelta[] = [];
  const changedMustChange =
    new Set<string>();

  for (const instanceKey of instanceKeys) {
    const left = beforeFrames.get(instanceKey);
    const right = afterFrames.get(instanceKey);

    if (!left || !right) {
      missing.push(instanceKey);
      continue;
    }

    const keys = new Set([
      ...Object.keys(left.values),
      ...Object.keys(right.values),
    ]);

    for (const key of keys) {
      const beforeValue = left.values[key];
      const afterValue = right.values[key];
      if (beforeValue === afterValue) {
        continue;
      }

      const classification =
        classifyKey(key, policy);
      if (classification === "must-change") {
        changedMustChange.add(key);
      }

      stateDeltas.push({
        checkpointId: left.checkpointId,
        occurrence: left.occurrence,
        stateKey: key,
        before: beforeValue,
        after: afterValue,
        classification,
      });
    }

    if (
      left.tick !== undefined &&
      right.tick !== undefined
    ) {
      const driftTicks =
        right.tick - left.tick;
      const tolerance =
        policy.timingToleranceTicks;
      timingDeltas.push({
        checkpointId: left.checkpointId,
        occurrence: left.occurrence,
        beforeTick: left.tick,
        afterTick: right.tick,
        driftTicks,
        exceedsTolerance:
          tolerance !== undefined &&
          Math.abs(driftTicks) > tolerance,
      });
    }
  }

  const unchangedMustChange = (
    policy.mustChangeStateKeys ?? []
  ).filter(
    (key) => !changedMustChange.has(key),
  );

  const preservedViolation =
    stateDeltas.some(
      (delta) =>
        delta.classification ===
          "must-preserve",
    );
  const unexpectedViolation =
    stateDeltas.some(
      (delta) =>
        delta.classification ===
          "unexpected",
    );
  const timingViolation =
    timingDeltas.some(
      (delta) =>
        delta.exceedsTolerance,
    );

  const reasons: string[] = [];

  if (missing.length > 0) {
    reasons.push(
      "One or more required semantic checkpoint instances are missing.",
    );
  }
  if (preservedViolation) {
    reasons.push(
      "A must-preserve state key changed.",
    );
  }
  if (unexpectedViolation) {
    reasons.push(
      "A state key outside the declared change surface changed.",
    );
  }
  if (timingViolation) {
    reasons.push(
      "Semantic checkpoint timing drift exceeded the declared tolerance.",
    );
  }
  if (unchangedMustChange.length > 0) {
    reasons.push(
      "One or more must-change state keys did not change.",
    );
  }

  if (
    missing.length > 0 ||
    !before.complete ||
    !after.complete
  ) {
    return {
      policyId: policy.id,
      disposition: "unknown",
      missingCheckpointInstances:
        missing.sort(),
      stateDeltas,
      timingDeltas,
      unchangedMustChangeStateKeys:
        unchangedMustChange,
      reasons: [
        ...reasons,
        ...(!before.complete ||
        !after.complete
          ? [
              "Both semantic traces must be complete before preservation equivalence can be proven.",
            ]
          : []),
      ],
    };
  }

  if (
    preservedViolation ||
    unexpectedViolation ||
    timingViolation ||
    unchangedMustChange.length > 0
  ) {
    return {
      policyId: policy.id,
      disposition: "violated",
      missingCheckpointInstances: [],
      stateDeltas,
      timingDeltas,
      unchangedMustChangeStateKeys:
        unchangedMustChange,
      reasons,
    };
  }

  const intendedChange =
    stateDeltas.some(
      (delta) =>
        delta.classification ===
          "must-change" ||
        delta.classification ===
          "allowed-change",
    );

  return {
    policyId: policy.id,
    disposition: intendedChange
      ? "changed-as-intended"
      : "equivalent",
    missingCheckpointInstances: [],
    stateDeltas,
    timingDeltas,
    unchangedMustChangeStateKeys: [],
    reasons: [
      intendedChange
        ? "All observed deltas are within the declared semantic change surface."
        : "Required semantic checkpoints are equivalent under the preservation policy.",
    ],
  };
}
