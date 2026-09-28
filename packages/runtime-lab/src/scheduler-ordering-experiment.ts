import type {
  RuntimeTemporalRequirement,
} from "../../project-model/src/index.js";
import type {
  RuntimeActionCapability,
  RuntimeActionCapabilityRegistry,
} from "./action-capability.js";
import type {
  RuntimeExperimentDefinition,
} from "./types.js";

export interface SchedulerOrderingExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  minimumRunsPerArm?: number;
}

export interface SchedulerOrderingExperimentPlan {
  definition: RuntimeExperimentDefinition;
  temporalRequirementsByArm: Readonly<
    Record<string, readonly RuntimeTemporalRequirement[]>
  >;
}

export const SCHEDULER_ORDERING_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] = [{
    id: "scheduler.reset-ordering-fixture",
    description:
      "Reset the controlled scheduler ordering fixture, marker stream, and completion state.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["setup"],
    requiredParameters: {
      objectiveId: "string",
      participant: "string",
    },
  }, {
    id: "scheduler.execute-nested-run-ordering",
    description:
      "Execute a controlled nested system.run chain and emit observed origin/callback timeline markers from the runtime that include comparable tick and sequence metadata.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      objectiveId: "string",
      participant: "string",
      nestingDepth: "number",
    },
  }, {
    id: "scheduler.cleanup-ordering-fixture",
    description:
      "Cancel remaining fixture-owned scheduler work and clear ordering markers.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["teardown"],
    requiredParameters: {
      objectiveId: "string",
      participant: "string",
    },
  }];

export const SCHEDULER_ORDERING_CAPABILITY_REGISTRY:
  RuntimeActionCapabilityRegistry = {
    schemaVersion: 1,
    actions: SCHEDULER_ORDERING_ACTION_CAPABILITIES,
  };

function requirement(
  armId: string,
  minTickDelta: number,
): RuntimeTemporalRequirement {
  return {
    id: "scheduler-origin-before-callback:" + armId,
    beforePredicate: "scheduler-origin-marker",
    afterPredicate: "scheduler-callback-marker",
    minTickDelta,
  };
}

export function createNestedSystemRunOrderingExperiment(
  input: SchedulerOrderingExperimentInput,
): SchedulerOrderingExperimentPlan {
  const definition: RuntimeExperimentDefinition = {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "event-ordering",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint:
      input.targetProfileFingerprint,
    fixtureFingerprint:
      input.fixtureFingerprint,
    protocol: [{
      id: "reset-ordering-fixture",
      phase: "setup",
      actionId: "scheduler.reset-ordering-fixture",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
      },
    }, {
      id: "execute-ordering-scenario",
      phase: "stimulus",
      actionId:
        "scheduler.execute-nested-run-ordering",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
        nestingDepth: "$factor.nesting-depth",
      },
    }, {
      id: "probe-trial-complete",
      phase: "observe",
      actionId: "probe.scoreboard-value",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
        expected: 1,
        predicate: "scheduler-ordering-trial-complete",
      },
    }, {
      id: "cleanup-ordering-fixture",
      phase: "teardown",
      actionId: "scheduler.cleanup-ordering-fixture",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
      },
    }],
    factors: [{
      id: "nesting-depth",
      description:
        "Number of nested system.run deferrals between origin marker and terminal callback marker.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "nesting-depth": 1,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "nesting-depth": 2,
      },
    }],
    outcomePredicateIds: [
      "scheduler-ordering-trial-complete",
    ],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };

  return {
    definition,
    temporalRequirementsByArm: {
      control: [requirement("control", 1)],
      treatment: [requirement("treatment", 2)],
    },
  };
}

export function validateSchedulerOrderingTimelineEvidence(
  evidence: readonly {
    predicate: string;
    state: string;
    confidence: string;
    observedAt?: {
      tick?: number;
      streamId?: string;
      sequence?: number;
    };
  }[],
): string[] {
  const errors: string[] = [];
  const origin = evidence.find(
    (record) =>
      record.predicate === "scheduler-origin-marker" &&
      record.state === "present" &&
      record.confidence === "observed",
  );
  const callback = evidence.find(
    (record) =>
      record.predicate === "scheduler-callback-marker" &&
      record.state === "present" &&
      record.confidence === "observed",
  );

  if (!origin) {
    errors.push(
      "Scheduler ordering trial is missing observed scheduler-origin-marker evidence.",
    );
  }
  if (!callback) {
    errors.push(
      "Scheduler ordering trial is missing observed scheduler-callback-marker evidence.",
    );
  }
  if (!origin || !callback) return errors;

  if (
    origin.observedAt?.streamId === undefined ||
    callback.observedAt?.streamId === undefined ||
    origin.observedAt.streamId !==
      callback.observedAt.streamId
  ) {
    errors.push(
      "Scheduler ordering markers must share one comparable runtime stream.",
    );
  }
  if (
    origin.observedAt?.sequence === undefined ||
    callback.observedAt?.sequence === undefined
  ) {
    errors.push(
      "Scheduler ordering markers require explicit runtime sequence values.",
    );
  }
  if (
    origin.observedAt?.tick === undefined ||
    callback.observedAt?.tick === undefined
  ) {
    errors.push(
      "Scheduler ordering markers require explicit runtime tick values.",
    );
  }

  return errors;
}
