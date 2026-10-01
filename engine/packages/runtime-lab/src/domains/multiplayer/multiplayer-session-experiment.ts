import type {
  RuntimeEvidenceRecord,
  RuntimeScope,
} from "../../../../project-model/src/index.js";
import type {
  RuntimeActionCapability,
  RuntimeActionCapabilityRegistry,
} from "../../core/action-capability.js";
import type {
  RuntimeExperimentDefinition,
} from "../../core/types.js";

export interface MultiplayerSessionSubject {
  playerKey: string;
  arenaId: string;
  arenaGeneration: number;
  connectionGeneration: number;
  participationGeneration: number;
  lifeGeneration: number;
}

export interface MultiplayerSessionExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  subject: MultiplayerSessionSubject;
  deferredTicks?: number;
  minimumRunsPerArm?: number;
}

export const MULTIPLAYER_SESSION_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] = [{
    id: "multiplayer.reset-session-fixture",
    description:
      "Reset controlled player session, join-pad, pending transition, progress, and teleport fixture state.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["setup"],
    requiredParameters: {
      playerKey: "string",
      arenaId: "string",
      arenaGeneration: "number",
      connectionGeneration: "number",
      participationGeneration: "number",
      lifeGeneration: "number",
    },
  }, {
    id: "multiplayer.enter-join-pad",
    description:
      "Enter the controlled arena join pad and create a pending join transition owned by the current player/session generations.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      playerKey: "string",
      arenaId: "string",
      arenaGeneration: "number",
      connectionGeneration: "number",
      participationGeneration: "number",
      lifeGeneration: "number",
      ownershipGuardEnabled: "boolean",
      deferredTicks: "number",
    },
  }, {
    id: "multiplayer.leave-join-pad",
    description:
      "Leave the controlled join pad before a deferred join transition becomes eligible.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      playerKey: "string",
      arenaId: "string",
      participationGeneration: "number",
    },
  }, {
    id: "multiplayer.disconnect-player",
    description:
      "Disconnect the controlled player and invalidate the active connection session.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      playerKey: "string",
      connectionGeneration: "number",
    },
  }, {
    id: "multiplayer.reconnect-player",
    description:
      "Reconnect the logical player under a new connectionGeneration and reset transient session state.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      playerKey: "string",
      previousConnectionGeneration: "number",
      connectionGeneration: "number",
      arenaId: "string",
      arenaGeneration: "number",
      participationGeneration: "number",
      lifeGeneration: "number",
    },
  }, {
    id: "multiplayer.kill-player",
    description:
      "Trigger controlled player death while a pending arena transition exists.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      playerKey: "string",
      lifeGeneration: "number",
    },
  }, {
    id: "multiplayer.respawn-player",
    description:
      "Respawn the controlled logical player under the next lifeGeneration while preserving only the declared durable arena/session state.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      playerKey: "string",
      previousLifeGeneration: "number",
      lifeGeneration: "number",
      connectionGeneration: "number",
      arenaId: "string",
      arenaGeneration: "number",
      participationGeneration: "number",
    },
  }, {
    id: "multiplayer.advance-runtime-ticks",
    description:
      "Advance the controlled multiplayer fixture until deferred session work becomes eligible.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      ticks: "number",
    },
  }, {
    id: "multiplayer.cleanup-session-fixture",
    description:
      "Clear pending fixture-owned transitions and restore the controlled player to the fixture baseline.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["teardown"],
    requiredParameters: {
      playerKey: "string",
      arenaId: "string",
    },
  }];

export const MULTIPLAYER_SESSION_CAPABILITY_REGISTRY:
  RuntimeActionCapabilityRegistry = {
    schemaVersion: 1,
    actions: MULTIPLAYER_SESSION_ACTION_CAPABILITIES,
  };

function scope(
  subject: MultiplayerSessionSubject,
  overrides: Partial<RuntimeScope> = {},
): RuntimeScope {
  return {
    playerKey: subject.playerKey,
    connectionGeneration:
      subject.connectionGeneration,
    lifeGeneration: subject.lifeGeneration,
    participationGeneration:
      subject.participationGeneration,
    arenaId: subject.arenaId,
    arenaGeneration: subject.arenaGeneration,
    ...overrides,
  };
}

function resetStep(
  input: MultiplayerSessionExperimentInput,
) {
  return {
    id: "reset-session-fixture",
    phase: "setup" as const,
    actionId: "multiplayer.reset-session-fixture",
    parameters: {
      playerKey: input.subject.playerKey,
      arenaId: input.subject.arenaId,
      arenaGeneration:
        input.subject.arenaGeneration,
      connectionGeneration:
        input.subject.connectionGeneration,
      participationGeneration:
        input.subject.participationGeneration,
      lifeGeneration:
        input.subject.lifeGeneration,
    },
  };
}

function enterJoinStep(
  input: MultiplayerSessionExperimentInput,
  guardFactor: string,
) {
  return {
    id: "enter-join-pad",
    phase: "stimulus" as const,
    actionId: "multiplayer.enter-join-pad",
    parameters: {
      playerKey: input.subject.playerKey,
      arenaId: input.subject.arenaId,
      arenaGeneration:
        input.subject.arenaGeneration,
      connectionGeneration:
        input.subject.connectionGeneration,
      participationGeneration:
        input.subject.participationGeneration,
      lifeGeneration:
        input.subject.lifeGeneration,
      ownershipGuardEnabled:
        "$factor." + guardFactor,
      deferredTicks: input.deferredTicks ?? 2,
    },
  };
}

function advanceStep(
  input: MultiplayerSessionExperimentInput,
) {
  return {
    id: "allow-pending-transition",
    phase: "stimulus" as const,
    actionId: "multiplayer.advance-runtime-ticks",
    parameters: {
      ticks: (input.deferredTicks ?? 2) + 1,
    },
  };
}

function completionProbe(
  input: MultiplayerSessionExperimentInput,
  predicate: string,
) {
  return {
    id: "probe-session-outcome",
    phase: "observe" as const,
    actionId: "probe.scoreboard-value",
    parameters: {
      objectiveId: input.objectiveId,
      participant: input.participant,
      expected: 1,
      predicate,
    },
  };
}

function cleanupStep(
  input: MultiplayerSessionExperimentInput,
) {
  return {
    id: "cleanup-session-fixture",
    phase: "teardown" as const,
    actionId: "multiplayer.cleanup-session-fixture",
    parameters: {
      playerKey: input.subject.playerKey,
      arenaId: input.subject.arenaId,
    },
  };
}

function guardArms(factorId: string) {
  return [{
    id: "control",
    role: "control" as const,
    factorValues: {
      [factorId]: true,
    },
  }, {
    id: "treatment",
    role: "treatment" as const,
    factorValues: {
      [factorId]: false,
    },
  }];
}

export function createJoinPadLeaveOwnershipExperiment(
  input: MultiplayerSessionExperimentInput,
): RuntimeExperimentDefinition {
  const subjectScope = scope(input.subject);

  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "multiplayer",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint:
      input.targetProfileFingerprint,
    fixtureFingerprint:
      input.fixtureFingerprint,
    protocol: [
      resetStep(input),
      enterJoinStep(input, "membership-guard-enabled"),
      {
        id: "leave-join-pad",
        phase: "stimulus",
        actionId: "multiplayer.leave-join-pad",
        parameters: {
          playerKey: input.subject.playerKey,
          arenaId: input.subject.arenaId,
          participationGeneration:
            input.subject.participationGeneration,
        },
      },
      advanceStep(input),
      completionProbe(
        input,
        "stale-join-transition-observed",
      ),
      cleanupStep(input),
    ],
    factors: [{
      id: "membership-guard-enabled",
      description:
        "Whether a pending join transition revalidates current arena membership/participation ownership after the player leaves the join pad.",
    }],
    arms: guardArms("membership-guard-enabled"),
    outcomePredicateIds: [
      "stale-join-transition-observed",
    ],
    expectedContrasts: [{
      predicateId: "stale-join-transition-observed",
      controlState: "absent",
      treatmentState: "present",
    }],
    evidenceRequirements: [{
      id: "join-request-observed",
      predicateId: "join-transition-requested",
      state: "present",
      scope: {
        ...subjectScope,
        operationId: "join-request",
      },
    }, {
      id: "join-pad-leave-observed",
      predicateId: "join-pad-left",
      state: "present",
      scope: {
        ...subjectScope,
        operationId: "join-pad-leave",
      },
    }, {
      id: "membership-revoked-after-leave",
      predicateId: "arena-membership-current",
      state: "absent",
      scope: {
        ...subjectScope,
        operationId: "post-leave",
      },
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

export function createReconnectGenerationResetExperiment(
  input: MultiplayerSessionExperimentInput,
): RuntimeExperimentDefinition {
  const oldConnection =
    input.subject.connectionGeneration;
  const newConnection = oldConnection + 1;
  const baseScope = scope(input.subject);

  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "multiplayer",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint:
      input.targetProfileFingerprint,
    fixtureFingerprint:
      input.fixtureFingerprint,
    protocol: [
      resetStep(input),
      enterJoinStep(
        input,
        "connection-generation-guard-enabled",
      ),
      {
        id: "disconnect-player",
        phase: "stimulus",
        actionId: "multiplayer.disconnect-player",
        parameters: {
          playerKey: input.subject.playerKey,
          connectionGeneration: oldConnection,
        },
      },
      {
        id: "reconnect-player",
        phase: "stimulus",
        actionId: "multiplayer.reconnect-player",
        parameters: {
          playerKey: input.subject.playerKey,
          previousConnectionGeneration:
            oldConnection,
          connectionGeneration: newConnection,
          arenaId: input.subject.arenaId,
          arenaGeneration:
            input.subject.arenaGeneration,
          participationGeneration:
            input.subject.participationGeneration + 1,
          lifeGeneration:
            input.subject.lifeGeneration,
        },
      },
      advanceStep(input),
      completionProbe(
        input,
        "stale-session-mutation-observed",
      ),
      cleanupStep(input),
    ],
    factors: [{
      id: "connection-generation-guard-enabled",
      description:
        "Whether deferred session work captured by the previous connectionGeneration self-cancels after reconnect.",
    }],
    arms: guardArms(
      "connection-generation-guard-enabled",
    ),
    outcomePredicateIds: [
      "stale-session-mutation-observed",
    ],
    expectedContrasts: [{
      predicateId: "stale-session-mutation-observed",
      controlState: "absent",
      treatmentState: "present",
    }],
    evidenceRequirements: [{
      id: "old-connection-disconnected",
      predicateId: "player-disconnected",
      state: "present",
      minimumProofAuthority: "live-runtime",
      scope: {
        ...baseScope,
        connectionGeneration: oldConnection,
        operationId: "disconnect",
      },
    }, {
      id: "new-connection-reconnected",
      predicateId: "player-reconnected",
      state: "present",
      minimumProofAuthority: "live-runtime",
      scope: {
        ...baseScope,
        connectionGeneration: newConnection,
        participationGeneration:
          input.subject.participationGeneration + 1,
        operationId: "reconnect",
      },
    }, {
      id: "new-session-progress-reset",
      predicateId: "session-progress-reset",
      state: "present",
      scope: {
        ...baseScope,
        connectionGeneration: newConnection,
        participationGeneration:
          input.subject.participationGeneration + 1,
        operationId: "reconnect-reconcile",
      },
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

export function createDeathDuringJoinExperiment(
  input: MultiplayerSessionExperimentInput,
): RuntimeExperimentDefinition {
  const oldLife = input.subject.lifeGeneration;
  const newLife = oldLife + 1;
  const baseScope = scope(input.subject);

  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "multiplayer",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint:
      input.targetProfileFingerprint,
    fixtureFingerprint:
      input.fixtureFingerprint,
    protocol: [
      resetStep(input),
      enterJoinStep(
        input,
        "life-generation-guard-enabled",
      ),
      {
        id: "kill-player",
        phase: "stimulus",
        actionId: "multiplayer.kill-player",
        parameters: {
          playerKey: input.subject.playerKey,
          lifeGeneration: oldLife,
        },
      },
      {
        id: "respawn-player",
        phase: "stimulus",
        actionId: "multiplayer.respawn-player",
        parameters: {
          playerKey: input.subject.playerKey,
          previousLifeGeneration: oldLife,
          lifeGeneration: newLife,
          connectionGeneration:
            input.subject.connectionGeneration,
          arenaId: input.subject.arenaId,
          arenaGeneration:
            input.subject.arenaGeneration,
          participationGeneration:
            input.subject.participationGeneration + 1,
        },
      },
      advanceStep(input),
      completionProbe(
        input,
        "stale-life-join-mutation-observed",
      ),
      cleanupStep(input),
    ],
    factors: [{
      id: "life-generation-guard-enabled",
      description:
        "Whether pending join work captured by the previous lifeGeneration self-cancels after death/respawn.",
    }],
    arms: guardArms("life-generation-guard-enabled"),
    outcomePredicateIds: [
      "stale-life-join-mutation-observed",
    ],
    expectedContrasts: [{
      predicateId:
        "stale-life-join-mutation-observed",
      controlState: "absent",
      treatmentState: "present",
    }],
    evidenceRequirements: [{
      id: "death-observed-old-life",
      predicateId: "player-death-observed",
      state: "present",
      minimumProofAuthority: "live-runtime",
      scope: {
        ...baseScope,
        lifeGeneration: oldLife,
        operationId: "death",
      },
    }, {
      id: "respawn-observed-new-life",
      predicateId: "player-respawn-observed",
      state: "present",
      minimumProofAuthority: "live-runtime",
      scope: {
        ...baseScope,
        lifeGeneration: newLife,
        participationGeneration:
          input.subject.participationGeneration + 1,
        operationId: "respawn",
      },
    }, {
      id: "pending-join-invalidated",
      predicateId: "pending-join-invalidated",
      state: "present",
      scope: {
        ...baseScope,
        lifeGeneration: newLife,
        participationGeneration:
          input.subject.participationGeneration + 1,
        operationId: "respawn-reconcile",
      },
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

export function validateMultiplayerSessionEvidence(
  evidence: readonly RuntimeEvidenceRecord[],
  expected: RuntimeScope,
  requiredPredicates: readonly string[],
): string[] {
  const errors: string[] = [];

  for (const predicate of requiredPredicates) {
    const match = evidence.find(
      (record) =>
        record.predicate === predicate &&
        record.state === "present" &&
        record.confidence === "observed" &&
        record.scope !== undefined &&
        Object.entries(expected).every(
          ([key, value]) =>
            value === undefined ||
            record.scope?.[
              key as keyof RuntimeScope
            ] === value,
        ),
    );

    if (!match) {
      errors.push(
        "Multiplayer session evidence is missing observed " +
          predicate +
          " for the expected runtime scope.",
      );
    }
  }

  return errors;
}
