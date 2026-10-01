import type {
  RuntimeActionCapability,
  RuntimeActionCapabilityRegistry,
} from "../../core/action-capability.js";
import type {
  RuntimeExperimentDefinition,
} from "../../core/types.js";

export interface SchedulerGenerationExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  callbackDelayTicks?: number;
  minimumRunsPerArm?: number;
}

export const SCHEDULER_GENERATION_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] = [{
    id: "scheduler.reset-generation-fixture",
    description:
      "Reset the controlled scheduler fixture, generation token, callback counters, and pending work owned by the fixture.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["setup"],
    requiredParameters: {
      objectiveId: "string",
      participant: "string",
    },
  }, {
    id: "scheduler.schedule-generation-callback",
    description:
      "Schedule a deferred callback bound to the fixture generation, optionally enforcing a generation guard before mutation.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      objectiveId: "string",
      participant: "string",
      delayTicks: "number",
      generationGuardEnabled: "boolean",
    },
  }, {
    id: "scheduler.advance-generation",
    description:
      "Replace the current fixture generation/session before the scheduled callback becomes eligible.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      objectiveId: "string",
      participant: "string",
    },
  }, {
    id: "scheduler.advance-runtime-ticks",
    description:
      "Advance or wait the controlled fixture for the requested tick count so deferred work can become eligible.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      ticks: "number",
    },
  }, {
    id: "scheduler.cancel-fixture-work",
    description:
      "Cancel and clean up all scheduled work owned by the controlled scheduler fixture.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["teardown"],
    requiredParameters: {
      objectiveId: "string",
      participant: "string",
    },
  }];

export const SCHEDULER_GENERATION_CAPABILITY_REGISTRY:
  RuntimeActionCapabilityRegistry = {
    schemaVersion: 1,
    actions: SCHEDULER_GENERATION_ACTION_CAPABILITIES,
  };

export function createStaleGenerationCallbackExperiment(
  input: SchedulerGenerationExperimentInput,
): RuntimeExperimentDefinition {
  const delayTicks = input.callbackDelayTicks ?? 2;

  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "scheduler",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint:
      input.targetProfileFingerprint,
    fixtureFingerprint:
      input.fixtureFingerprint,
    protocol: [{
      id: "reset-fixture",
      phase: "setup",
      actionId: "scheduler.reset-generation-fixture",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
      },
    }, {
      id: "schedule-old-generation-callback",
      phase: "stimulus",
      actionId: "scheduler.schedule-generation-callback",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
        delayTicks,
        generationGuardEnabled:
          "$factor.generation-guard-enabled",
      },
    }, {
      id: "replace-generation",
      phase: "stimulus",
      actionId: "scheduler.advance-generation",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
      },
    }, {
      id: "allow-deferred-work",
      phase: "stimulus",
      actionId: "scheduler.advance-runtime-ticks",
      parameters: {
        ticks: delayTicks + 1,
      },
    }, {
      id: "probe-stale-callback",
      phase: "observe",
      actionId: "probe.scoreboard-value",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
        expected: 1,
        predicate: "stale-callback-observed",
      },
    }, {
      id: "cleanup-scheduled-work",
      phase: "teardown",
      actionId: "scheduler.cancel-fixture-work",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
      },
    }],
    factors: [{
      id: "generation-guard-enabled",
      description:
        "Whether the deferred callback refuses mutation after its owning generation/session has been replaced.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "generation-guard-enabled": true,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "generation-guard-enabled": false,
      },
    }],
    outcomePredicateIds: [
      "stale-callback-observed",
    ],
    expectedContrasts: [{
      predicateId: "stale-callback-observed",
      controlState: "absent",
      treatmentState: "present",
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}
