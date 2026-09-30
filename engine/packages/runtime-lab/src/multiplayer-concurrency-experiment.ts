import type {
  RuntimeActionCapability,
  RuntimeActionCapabilityRegistry,
} from "./action-capability.js";
import type {
  RuntimeExperimentDefinition,
} from "./types.js";

export interface ArenaConcurrencyTarget {
  arenaId: string;
  arenaGeneration: number;
}

export interface ArenaCapacityExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  arena: ArenaConcurrencyTarget;
  maxPlayers?: number;
  attemptedPlayers?: number;
  minimumRunsPerArm?: number;
}

export interface FullCapacitySessionExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  arena: ArenaConcurrencyTarget;
  maxPlayers?: number;
  minimumRunsPerArm?: number;
}

export interface MultiArenaStartExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  arenaA: ArenaConcurrencyTarget;
  arenaB: ArenaConcurrencyTarget;
  playerCountPerArena?: number;
  minimumRunsPerArm?: number;
}

export const MULTIPLAYER_CONCURRENCY_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] = [{
    id: "multiplayer.reset-concurrency-fixture",
    description:
      "Reset controlled arena membership/start/cleanup state for concurrency experiments.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["setup"],
    requiredParameters: {
      arenaA: "string",
      arenaGenerationA: "number",
    },
    optionalParameters: {
      arenaB: "string",
      arenaGenerationB: "number",
    },
  }, {
    id: "multiplayer.execute-join-burst",
    description:
      "Issue a controlled near-simultaneous arena join burst and emit membership/capacity evidence.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      arenaId: "string",
      arenaGeneration: "number",
      attemptedPlayers: "number",
      maxPlayers: "number",
      capacityGuardEnabled: "boolean",
    },
  }, {
    id: "multiplayer.execute-full-session",
    description:
      "Run one controlled arena session from join through start, terminal cleanup, and lobby return for the requested player count.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      arenaId: "string",
      arenaGeneration: "number",
      playerCount: "number",
      maxPlayers: "number",
    },
  }, {
    id: "multiplayer.execute-multi-arena-start-burst",
    description:
      "Issue concurrent start requests in two arenas and emit per-arena start-owner/countdown evidence.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      arenaA: "string",
      arenaGenerationA: "number",
      arenaB: "string",
      arenaGenerationB: "number",
      playerCountA: "number",
      playerCountB: "number",
      startOwnershipGuardEnabled: "boolean",
    },
  }, {
    id: "multiplayer.cleanup-concurrency-fixture",
    description:
      "Clear fixture-owned concurrency state and return controlled players to the baseline lobby.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["teardown"],
    requiredParameters: {
      arenaA: "string",
    },
    optionalParameters: {
      arenaB: "string",
    },
  }];

export const MULTIPLAYER_CONCURRENCY_CAPABILITY_REGISTRY:
  RuntimeActionCapabilityRegistry = {
    schemaVersion: 1,
    actions: MULTIPLAYER_CONCURRENCY_ACTION_CAPABILITIES,
  };

function completionProbe(
  objectiveId: string,
  participant: string,
  predicate: string,
) {
  return {
    id: "probe-concurrency-outcome",
    phase: "observe" as const,
    actionId: "probe.scoreboard-value",
    parameters: {
      objectiveId,
      participant,
      expected: 1,
      predicate,
    },
  };
}

export function createArenaCapacityGuardExperiment(
  input: ArenaCapacityExperimentInput,
): RuntimeExperimentDefinition {
  const maxPlayers = input.maxPlayers ?? 5;
  const attemptedPlayers =
    input.attemptedPlayers ?? maxPlayers + 1;
  const arenaScope = {
    arenaId: input.arena.arenaId,
    arenaGeneration: input.arena.arenaGeneration,
  };

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
    protocol: [{
      id: "reset-concurrency-fixture",
      phase: "setup",
      actionId: "multiplayer.reset-concurrency-fixture",
      parameters: {
        arenaA: input.arena.arenaId,
        arenaGenerationA:
          input.arena.arenaGeneration,
      },
    }, {
      id: "execute-join-burst",
      phase: "stimulus",
      actionId: "multiplayer.execute-join-burst",
      parameters: {
        arenaId: input.arena.arenaId,
        arenaGeneration:
          input.arena.arenaGeneration,
        attemptedPlayers,
        maxPlayers,
        capacityGuardEnabled:
          "$factor.capacity-guard-enabled",
      },
    },
    completionProbe(
      input.objectiveId,
      input.participant,
      "arena-capacity-overflow-observed",
    ), {
      id: "cleanup-concurrency-fixture",
      phase: "teardown",
      actionId: "multiplayer.cleanup-concurrency-fixture",
      parameters: {
        arenaA: input.arena.arenaId,
      },
    }],
    factors: [{
      id: "capacity-guard-enabled",
      description:
        "Whether simultaneous membership commits enforce the arena max-player boundary atomically.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "capacity-guard-enabled": true,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "capacity-guard-enabled": false,
      },
    }],
    outcomePredicateIds: [
      "arena-capacity-overflow-observed",
    ],
    expectedContrasts: [{
      predicateId:
        "arena-capacity-overflow-observed",
      controlState: "absent",
      treatmentState: "present",
    }],
    evidenceRequirements: [{
      id: "join-burst-observed",
      predicateId: "arena-join-burst-observed",
      state: "present",
      scope: arenaScope,
      measurements: {
        attemptedPlayers: {
          equals: attemptedPlayers,
        },
        maxPlayers: {
          equals: maxPlayers,
        },
      },
    }, {
      id: "control-membership-bounded",
      predicateId: "arena-membership-count-sampled",
      state: "present",
      armIds: ["control"],
      scope: arenaScope,
      measurements: {
        activePlayers: {
          max: maxPlayers,
        },
      },
    }, {
      id: "control-overflow-rejected",
      predicateId: "arena-join-rejection-count-sampled",
      state: "present",
      armIds: ["control"],
      scope: arenaScope,
      measurements: {
        rejectedPlayers: {
          min: Math.max(
            1,
            attemptedPlayers - maxPlayers,
          ),
        },
      },
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

export function createFullCapacitySessionExperiment(
  input: FullCapacitySessionExperimentInput,
): RuntimeExperimentDefinition {
  const maxPlayers = input.maxPlayers ?? 5;
  const arenaScope = {
    arenaId: input.arena.arenaId,
    arenaGeneration: input.arena.arenaGeneration,
  };

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
    protocol: [{
      id: "reset-concurrency-fixture",
      phase: "setup",
      actionId: "multiplayer.reset-concurrency-fixture",
      parameters: {
        arenaA: input.arena.arenaId,
        arenaGenerationA:
          input.arena.arenaGeneration,
      },
    }, {
      id: "execute-full-session",
      phase: "stimulus",
      actionId: "multiplayer.execute-full-session",
      parameters: {
        arenaId: input.arena.arenaId,
        arenaGeneration:
          input.arena.arenaGeneration,
        playerCount: "$factor.player-count",
        maxPlayers,
      },
    },
    completionProbe(
      input.objectiveId,
      input.participant,
      "arena-session-invariant-violation-observed",
    ), {
      id: "cleanup-concurrency-fixture",
      phase: "teardown",
      actionId: "multiplayer.cleanup-concurrency-fixture",
      parameters: {
        arenaA: input.arena.arenaId,
      },
    }],
    factors: [{
      id: "player-count",
      description:
        "Controlled active player count used to compare single-player and full-capacity arena sessions.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "player-count": 1,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "player-count": maxPlayers,
      },
    }],
    outcomePredicateIds: [
      "arena-session-invariant-violation-observed",
    ],
    evidenceRequirements: [{
      id: "control-player-count",
      predicateId: "arena-player-count-sampled",
      state: "present",
      armIds: ["control"],
      scope: arenaScope,
      measurements: {
        activePlayers: {
          equals: 1,
        },
      },
    }, {
      id: "full-capacity-player-count",
      predicateId: "arena-player-count-sampled",
      state: "present",
      armIds: ["treatment"],
      scope: arenaScope,
      measurements: {
        activePlayers: {
          equals: maxPlayers,
        },
      },
    }, {
      id: "session-started",
      predicateId: "arena-session-started",
      state: "present",
      scope: arenaScope,
    }, {
      id: "session-cleanup-complete",
      predicateId: "arena-session-cleanup-complete",
      state: "present",
      scope: arenaScope,
    }, {
      id: "control-returned-lobby",
      predicateId: "arena-participants-returned-lobby",
      state: "present",
      armIds: ["control"],
      scope: arenaScope,
      measurements: {
        returnedPlayers: {
          equals: 1,
        },
      },
    }, {
      id: "full-capacity-returned-lobby",
      predicateId: "arena-participants-returned-lobby",
      state: "present",
      armIds: ["treatment"],
      scope: arenaScope,
      measurements: {
        returnedPlayers: {
          equals: maxPlayers,
        },
      },
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

export function createMultiArenaStartOwnershipExperiment(
  input: MultiArenaStartExperimentInput,
): RuntimeExperimentDefinition {
  const playerCount =
    input.playerCountPerArena ?? 5;

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
    protocol: [{
      id: "reset-concurrency-fixture",
      phase: "setup",
      actionId: "multiplayer.reset-concurrency-fixture",
      parameters: {
        arenaA: input.arenaA.arenaId,
        arenaGenerationA:
          input.arenaA.arenaGeneration,
        arenaB: input.arenaB.arenaId,
        arenaGenerationB:
          input.arenaB.arenaGeneration,
      },
    }, {
      id: "execute-multi-arena-start-burst",
      phase: "stimulus",
      actionId:
        "multiplayer.execute-multi-arena-start-burst",
      parameters: {
        arenaA: input.arenaA.arenaId,
        arenaGenerationA:
          input.arenaA.arenaGeneration,
        arenaB: input.arenaB.arenaId,
        arenaGenerationB:
          input.arenaB.arenaGeneration,
        playerCountA: playerCount,
        playerCountB: playerCount,
        startOwnershipGuardEnabled:
          "$factor.start-ownership-guard-enabled",
      },
    },
    completionProbe(
      input.objectiveId,
      input.participant,
      "arena-start-ownership-violation-observed",
    ), {
      id: "cleanup-concurrency-fixture",
      phase: "teardown",
      actionId: "multiplayer.cleanup-concurrency-fixture",
      parameters: {
        arenaA: input.arenaA.arenaId,
        arenaB: input.arenaB.arenaId,
      },
    }],
    factors: [{
      id: "start-ownership-guard-enabled",
      description:
        "Whether each arena generation accepts only one start transaction owner while allowing independent arenas to start concurrently.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "start-ownership-guard-enabled": true,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "start-ownership-guard-enabled": false,
      },
    }],
    outcomePredicateIds: [
      "arena-start-ownership-violation-observed",
    ],
    expectedContrasts: [{
      predicateId:
        "arena-start-ownership-violation-observed",
      controlState: "absent",
      treatmentState: "present",
    }],
    evidenceRequirements: [{
      id: "arena-a-start-burst",
      predicateId: "arena-start-request-burst-observed",
      state: "present",
      scope: {
        arenaId: input.arenaA.arenaId,
        arenaGeneration:
          input.arenaA.arenaGeneration,
      },
      measurements: {
        playerCount: {
          equals: playerCount,
        },
        startRequests: {
          min: 2,
        },
      },
    }, {
      id: "arena-b-start-burst",
      predicateId: "arena-start-request-burst-observed",
      state: "present",
      scope: {
        arenaId: input.arenaB.arenaId,
        arenaGeneration:
          input.arenaB.arenaGeneration,
      },
      measurements: {
        playerCount: {
          equals: playerCount,
        },
        startRequests: {
          min: 2,
        },
      },
    }, {
      id: "control-arena-a-single-owner",
      predicateId: "arena-start-owner-count-sampled",
      state: "present",
      armIds: ["control"],
      scope: {
        arenaId: input.arenaA.arenaId,
        arenaGeneration:
          input.arenaA.arenaGeneration,
      },
      measurements: {
        owners: {
          equals: 1,
        },
      },
    }, {
      id: "control-arena-b-single-owner",
      predicateId: "arena-start-owner-count-sampled",
      state: "present",
      armIds: ["control"],
      scope: {
        arenaId: input.arenaB.arenaId,
        arenaGeneration:
          input.arenaB.arenaGeneration,
      },
      measurements: {
        owners: {
          equals: 1,
        },
      },
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}
