import type {
  SessionPhase,
} from "./session-model.js";

export type SessionLifecycleEvent =
  | "disconnect"
  | "reconnect"
  | "last-player-leaves"
  | "complete"
  | "abort";

export interface SessionLifecyclePolicyRule {
  phase: SessionPhase;
  event: SessionLifecycleEvent;
  expectedPhase: SessionPhase;
  preserveArenaAssignment: boolean;
  preserveProgress: boolean;
  releaseArenaWhenEmpty?: boolean;
}

export interface SessionLifecycleObservation {
  phase: SessionPhase;
  event: SessionLifecycleEvent;
  resultingPhase?: SessionPhase;
  preservedArenaAssignment?: boolean;
  preservedProgress?: boolean;
  releasedArenaWhenEmpty?: boolean;
}

export interface SessionLifecyclePolicyViolation {
  phase: SessionPhase;
  event: SessionLifecycleEvent;
  field:
    | "resultingPhase"
    | "preserveArenaAssignment"
    | "preserveProgress"
    | "releaseArenaWhenEmpty";
  expected: unknown;
  actual: unknown;
}

export interface SessionLifecyclePolicyAssessment {
  status: "proven" | "violated" | "unknown";
  checkedRules: number;
  missingRules: readonly {
    phase: SessionPhase;
    event: SessionLifecycleEvent;
  }[];
  violations: readonly SessionLifecyclePolicyViolation[];
}

function ruleKey(
  phase: SessionPhase,
  event: SessionLifecycleEvent,
): string {
  return phase + "::" + event;
}

export function assessSessionLifecyclePolicy(
  rules: readonly SessionLifecyclePolicyRule[],
  observations: readonly SessionLifecycleObservation[],
): SessionLifecyclePolicyAssessment {
  const byKey = new Map(
    observations.map((item) => [ruleKey(item.phase, item.event), item]),
  );
  const violations: SessionLifecyclePolicyViolation[] = [];
  const missingRules: Array<{
    phase: SessionPhase;
    event: SessionLifecycleEvent;
  }> = [];
  let checkedRules = 0;

  for (const rule of rules) {
    const observation = byKey.get(ruleKey(rule.phase, rule.event));
    if (!observation) {
      missingRules.push({
        phase: rule.phase,
        event: rule.event,
      });
      continue;
    }

    checkedRules += 1;

    const compare = (
      field: SessionLifecyclePolicyViolation["field"],
      expected: unknown,
      actual: unknown,
    ) => {
      if (actual === undefined) return;
      if (actual === expected) return;
      violations.push({
        phase: rule.phase,
        event: rule.event,
        field,
        expected,
        actual,
      });
    };

    compare(
      "resultingPhase",
      rule.expectedPhase,
      observation.resultingPhase,
    );
    compare(
      "preserveArenaAssignment",
      rule.preserveArenaAssignment,
      observation.preservedArenaAssignment,
    );
    compare(
      "preserveProgress",
      rule.preserveProgress,
      observation.preservedProgress,
    );
    if (rule.releaseArenaWhenEmpty !== undefined) {
      compare(
        "releaseArenaWhenEmpty",
        rule.releaseArenaWhenEmpty,
        observation.releasedArenaWhenEmpty,
      );
    }
  }

  return {
    status:
      violations.length > 0
        ? "violated"
        : missingRules.length > 0
          ? "unknown"
          : "proven",
    checkedRules,
    missingRules,
    violations,
  };
}

export function defaultRestartOnReconnectPolicy():
  readonly SessionLifecyclePolicyRule[] {
  return [
    {
      phase: "assigned",
      event: "disconnect",
      expectedPhase: "assigned",
      preserveArenaAssignment: true,
      preserveProgress: false,
    },
    {
      phase: "starting",
      event: "disconnect",
      expectedPhase: "assigned",
      preserveArenaAssignment: true,
      preserveProgress: false,
    },
    {
      phase: "playing",
      event: "disconnect",
      expectedPhase: "assigned",
      preserveArenaAssignment: true,
      preserveProgress: false,
    },
    {
      phase: "assigned",
      event: "reconnect",
      expectedPhase: "assigned",
      preserveArenaAssignment: true,
      preserveProgress: false,
    },
    {
      phase: "starting",
      event: "reconnect",
      expectedPhase: "assigned",
      preserveArenaAssignment: true,
      preserveProgress: false,
    },
    {
      phase: "playing",
      event: "reconnect",
      expectedPhase: "assigned",
      preserveArenaAssignment: true,
      preserveProgress: false,
    },
  ] as const;
}
