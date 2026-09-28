import type {
  RuntimeEvidenceRecord,
} from "../../project-model/src/index.js";
import type {
  RuntimeActionCapability,
  RuntimeActionCapabilityRegistry,
} from "./action-capability.js";
import type {
  RuntimeExperimentDefinition,
} from "./types.js";

export interface SchedulerCancellationExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  callbackDelayTicks?: number;
  minimumRunsPerArm?: number;
}

export interface SchedulerCrossArenaIsolationExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  arenaA: string;
  arenaB: string;
  arenaGeneration?: number;
  callbackDelayTicks?: number;
  minimumRunsPerArm?: number;
}

export const SCHEDULER_ISOLATION_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] = [{
    id: "scheduler.reset-owned-work-fixture",
    description:
      "Reset controlled scheduler work, ownership generations, counters, and markers for the fixture.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["setup"],
    requiredParameters: {
      objectiveId: "string",
      participant: "string",
    },
  }, {
    id: "scheduler.schedule-owned-callback",
    description:
      "Schedule a deferred callback owned by a declared arena/session generation.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      objectiveId: "string",
      participant: "string",
      ownerArenaId: "string",
      targetArenaId: "string",
      arenaGeneration: "number",
      delayTicks: "number",
      ownerGuardEnabled: "boolean",
    },
  }, {
    id: "scheduler.cancel-owned-work",
    description:
      "Cancel fixture-owned pending callbacks when enabled and emit explicit cancellation evidence.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus", "teardown"],
    requiredParameters: {
      objectiveId: "string",
      participant: "string",
      enabled: "boolean",
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
    id: "scheduler.cleanup-owned-work-fixture",
    description:
      "Cancel remaining fixture-owned scheduler work and clear owned-work state.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["teardown"],
    requiredParameters: {
      objectiveId: "string",
      participant: "string",
    },
  }];

export const SCHEDULER_ISOLATION_CAPABILITY_REGISTRY:
  RuntimeActionCapabilityRegistry = {
    schemaVersion: 1,
    actions: SCHEDULER_ISOLATION_ACTION_CAPABILITIES,
  };

export function createSchedulerCancellationExperiment(
  input: SchedulerCancellationExperimentInput,
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
      id: "reset-owned-work",
      phase: "setup",
      actionId: "scheduler.reset-owned-work-fixture",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
      },
    }, {
      id: "schedule-pending-callback",
      phase: "stimulus",
      actionId: "scheduler.schedule-owned-callback",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
        ownerArenaId: "arena-a",
        targetArenaId: "arena-a",
        arenaGeneration: 1,
        delayTicks,
        ownerGuardEnabled: true,
      },
    }, {
      id: "cancel-pending-work",
      phase: "stimulus",
      actionId: "scheduler.cancel-owned-work",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
        enabled: "$factor.cancellation-enabled",
      },
    }, {
      id: "allow-callback-window",
      phase: "stimulus",
      actionId: "scheduler.advance-runtime-ticks",
      parameters: {
        ticks: delayTicks + 1,
      },
    }, {
      id: "probe-cancelled-callback-mutation",
      phase: "observe",
      actionId: "probe.scoreboard-value",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
        expected: 1,
        predicate: "cancelled-callback-mutation-observed",
      },
    }, {
      id: "cleanup-owned-work",
      phase: "teardown",
      actionId: "scheduler.cleanup-owned-work-fixture",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
      },
    }],
    factors: [{
      id: "cancellation-enabled",
      description:
        "Whether pending fixture-owned work is cancelled before its eligibility window.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "cancellation-enabled": true,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "cancellation-enabled": false,
      },
    }],
    outcomePredicateIds: [
      "cancelled-callback-mutation-observed",
    ],
    expectedContrasts: [{
      predicateId:
        "cancelled-callback-mutation-observed",
      controlState: "absent",
      treatmentState: "present",
    }],
    evidenceRequirements: [{
      id: "control-cancel-confirmed",
      predicateId: "scheduler-work-cancelled",
      state: "present",
      armIds: ["control"],
    }, {
      id: "control-callback-suppressed",
      predicateId: "scheduler-callback-attempted",
      state: "absent",
      armIds: ["control"],
    }, {
      id: "treatment-cancel-disabled",
      predicateId: "scheduler-work-cancelled",
      state: "absent",
      armIds: ["treatment"],
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

export function createSchedulerCrossArenaIsolationExperiment(
  input: SchedulerCrossArenaIsolationExperimentInput,
): RuntimeExperimentDefinition {
  const delayTicks = input.callbackDelayTicks ?? 2;
  const generation = input.arenaGeneration ?? 1;

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
      id: "reset-owned-work",
      phase: "setup",
      actionId: "scheduler.reset-owned-work-fixture",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
      },
    }, {
      id: "schedule-arena-a-callback",
      phase: "stimulus",
      actionId: "scheduler.schedule-owned-callback",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
        ownerArenaId: input.arenaA,
        targetArenaId: input.arenaB,
        arenaGeneration: generation,
        delayTicks,
        ownerGuardEnabled:
          "$factor.owner-isolation-enabled",
      },
    }, {
      id: "allow-callback-window",
      phase: "stimulus",
      actionId: "scheduler.advance-runtime-ticks",
      parameters: {
        ticks: delayTicks + 1,
      },
    }, {
      id: "probe-cross-arena-mutation",
      phase: "observe",
      actionId: "probe.scoreboard-value",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
        expected: 1,
        predicate: "cross-arena-mutation-observed",
      },
    }, {
      id: "cleanup-owned-work",
      phase: "teardown",
      actionId: "scheduler.cleanup-owned-work-fixture",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
      },
    }],
    factors: [{
      id: "owner-isolation-enabled",
      description:
        "Whether callback mutation is rejected when the target arena differs from the callback owner arena/session.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "owner-isolation-enabled": true,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "owner-isolation-enabled": false,
      },
    }],
    outcomePredicateIds: [
      "cross-arena-mutation-observed",
    ],
    expectedContrasts: [{
      predicateId: "cross-arena-mutation-observed",
      controlState: "absent",
      treatmentState: "present",
    }],
    evidenceRequirements: [{
      id: "callback-attempt-owned-by-arena-a",
      predicateId: "scheduler-callback-attempted",
      state: "present",
      scope: {
        arenaId: input.arenaA,
        arenaGeneration: generation,
      },
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

export function validateSchedulerCancellationEvidence(
  evidence: readonly RuntimeEvidenceRecord[],
): string[] {
  const errors: string[] = [];
  const cancellation = evidence.find(
    (record) =>
      record.predicate ===
        "scheduler-work-cancelled" &&
      record.state === "present" &&
      record.confidence === "observed",
  );
  const callbackAttempt = evidence.find(
    (record) =>
      record.predicate ===
        "scheduler-callback-attempted" &&
      record.state === "present" &&
      record.confidence === "observed",
  );
  const mutation = evidence.find(
    (record) =>
      record.predicate ===
        "cancelled-callback-mutation-observed" &&
      record.state === "present" &&
      record.confidence === "observed",
  );

  if (!cancellation) {
    errors.push(
      "Scheduler cancellation proof is missing explicit scheduler-work-cancelled evidence.",
    );
  }
  if (callbackAttempt) {
    errors.push(
      "Scheduler cancellation proof observed a callback attempt after cancellation; cancellation did not fully suppress the pending callback.",
    );
  }
  if (mutation) {
    errors.push(
      "Scheduler cancellation proof observed mutation after cancellation.",
    );
  }

  return errors;
}

export function createBidirectionalSchedulerIsolationExperiment(
  input: SchedulerCrossArenaIsolationExperimentInput,
): RuntimeExperimentDefinition {
  const delayTicks = input.callbackDelayTicks ?? 2;
  const generation = input.arenaGeneration ?? 1;

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
      id: "reset-owned-work",
      phase: "setup",
      actionId: "scheduler.reset-owned-work-fixture",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
      },
    }, {
      id: "schedule-arena-a-to-b",
      phase: "stimulus",
      actionId: "scheduler.schedule-owned-callback",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
        ownerArenaId: input.arenaA,
        targetArenaId: input.arenaB,
        arenaGeneration: generation,
        delayTicks,
        ownerGuardEnabled:
          "$factor.owner-isolation-enabled",
      },
    }, {
      id: "schedule-arena-b-to-a",
      phase: "stimulus",
      actionId: "scheduler.schedule-owned-callback",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
        ownerArenaId: input.arenaB,
        targetArenaId: input.arenaA,
        arenaGeneration: generation,
        delayTicks,
        ownerGuardEnabled:
          "$factor.owner-isolation-enabled",
      },
    }, {
      id: "allow-concurrent-callback-window",
      phase: "stimulus",
      actionId: "scheduler.advance-runtime-ticks",
      parameters: {
        ticks: delayTicks + 1,
      },
    }, {
      id: "probe-cross-arena-mutation",
      phase: "observe",
      actionId: "probe.scoreboard-value",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
        expected: 1,
        predicate: "cross-arena-mutation-observed",
      },
    }, {
      id: "cleanup-owned-work",
      phase: "teardown",
      actionId: "scheduler.cleanup-owned-work-fixture",
      parameters: {
        objectiveId: input.objectiveId,
        participant: input.participant,
      },
    }],
    factors: [{
      id: "owner-isolation-enabled",
      description:
        "Whether concurrently scheduled callbacks are prevented from mutating a different arena than their owner.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "owner-isolation-enabled": true,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "owner-isolation-enabled": false,
      },
    }],
    outcomePredicateIds: [
      "cross-arena-mutation-observed",
    ],
    expectedContrasts: [{
      predicateId: "cross-arena-mutation-observed",
      controlState: "absent",
      treatmentState: "present",
    }],
    evidenceRequirements: [{
      id: "callback-attempt-owned-by-arena-a",
      predicateId: "scheduler-callback-attempted",
      state: "present",
      scope: {
        arenaId: input.arenaA,
        arenaGeneration: generation,
      },
    }, {
      id: "callback-attempt-owned-by-arena-b",
      predicateId: "scheduler-callback-attempted",
      state: "present",
      scope: {
        arenaId: input.arenaB,
        arenaGeneration: generation,
      },
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

export function validateCrossArenaSchedulerEvidence(
  evidence: readonly RuntimeEvidenceRecord[],
  expectedOwnerArenaId: string,
  expectedTargetArenaId: string,
  expectedGeneration: number,
): string[] {
  const errors: string[] = [];
  const attempt = evidence.find(
    (record) =>
      record.predicate ===
        "scheduler-callback-attempted" &&
      record.state === "present" &&
      record.confidence === "observed",
  );
  const mutation = evidence.find(
    (record) =>
      record.predicate ===
        "cross-arena-mutation-observed" &&
      record.state === "present" &&
      record.confidence === "observed",
  );

  if (!attempt) {
    errors.push(
      "Cross-arena scheduler evidence is missing scheduler-callback-attempted observation.",
    );
  } else {
    if (
      attempt.scope?.arenaId !==
        expectedOwnerArenaId ||
      attempt.scope?.arenaGeneration !==
        expectedGeneration
    ) {
      errors.push(
        "Scheduler callback attempt evidence is not scoped to the expected owner arena generation.",
      );
    }
  }

  if (mutation) {
    if (
      mutation.scope?.arenaId !==
        expectedTargetArenaId ||
      mutation.scope?.arenaGeneration !==
        expectedGeneration
    ) {
      errors.push(
        "Cross-arena mutation evidence is not scoped to the expected target arena generation.",
      );
    }
  }

  return errors;
}
