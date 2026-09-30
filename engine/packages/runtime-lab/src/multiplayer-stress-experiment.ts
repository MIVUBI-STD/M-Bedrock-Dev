import type {
  RuntimeActionCapability,
  RuntimeActionCapabilityRegistry,
} from "./action-capability.js";
import type {
  RuntimeExperimentDefinition,
  RuntimeExperimentEvidenceRequirement,
} from "./types.js";

export interface ArenaStressTarget {
  arenaId: string;
  arenaGeneration: number;
}

export interface AllArenaStressExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  arenas: readonly ArenaStressTarget[];
  playerCountPerArena: number;
  minimumRunsPerArm?: number;
}

export interface PlayerDisconnectStressExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  subject: {
    playerKey: string;
    arenaId: string;
    arenaGeneration: number;
    connectionGeneration: number;
    participationGeneration: number;
    lifeGeneration: number;
  };
  minimumRunsPerArm?: number;
}

export interface CleanupStartOverlapExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  endingArena: ArenaStressTarget;
  startingArena: ArenaStressTarget;
  playerCountStartingArena: number;
  minimumRunsPerArm?: number;
}

export const MULTIPLAYER_STRESS_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] = [{
    id: "multiplayer.reset-arena-stress-fixture",
    description:
      "Reset multiple arena generations and controlled participants before a cross-arena stress experiment.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["setup"],
    requiredParameters: {
      arenaIds: "string",
      arenaGenerations: "string",
    },
  }, {
    id: "multiplayer.execute-all-arena-start-burst",
    description:
      "Issue near-simultaneous start contention in all supplied arenas while preserving independent arena ownership.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      arenaIds: "string",
      arenaGenerations: "string",
      playerCountPerArena: "number",
      startOwnershipGuardEnabled: "boolean",
    },
  }, {
    id: "multiplayer.execute-all-arena-finish-burst",
    description:
      "Drive all supplied arenas through terminal finish/cleanup in one scheduling window.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      arenaIds: "string",
      arenaGenerations: "string",
      playerCountPerArena: "number",
    },
  }, {
    id: "multiplayer.execute-cleanup-start-overlap",
    description:
      "Overlap terminal cleanup in one arena with setup/start in another arena.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      endingArenaId: "string",
      endingArenaGeneration: "number",
      startingArenaId: "string",
      startingArenaGeneration: "number",
      startingPlayerCount: "number",
    },
  }, {
    id: "multiplayer.execute-staggered-full-join",
    description:
      "Fill all supplied arenas using interleaved joins separated by a bounded tick spacing.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      arenaIds: "string",
      arenaGenerations: "string",
      playersPerArena: "number",
      joinSpacingTicks: "number",
    },
  }, {
    id: "multiplayer.execute-disconnect-during-setup",
    description:
      "Disconnect one player after arena setup begins but before active play and emit generation-scoped reconciliation evidence.",
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
    },
  }, {
    id: "multiplayer.execute-disconnect-during-active",
    description:
      "Disconnect one active player and emit progress/session reconciliation evidence scoped to the captured generations.",
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
    },
  }, {
    id: "multiplayer.cleanup-arena-stress-fixture",
    description:
      "Restore all stress-fixture arenas and controlled participants to baseline after a stress experiment.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["teardown"],
    requiredParameters: {
      arenaIds: "string",
    },
  }];

export const MULTIPLAYER_STRESS_CAPABILITY_REGISTRY:
  RuntimeActionCapabilityRegistry = {
    schemaVersion: 1,
    actions: MULTIPLAYER_STRESS_ACTION_CAPABILITIES,
  };

function encodedArenaIds(
  arenas: readonly ArenaStressTarget[],
): string {
  return arenas.map((arena) => arena.arenaId).join(",");
}

function encodedGenerations(
  arenas: readonly ArenaStressTarget[],
): string {
  return arenas
    .map((arena) => String(arena.arenaGeneration))
    .join(",");
}

function scoreProbe(
  input: {
    objectiveId: string;
    participant: string;
  },
  predicate: string,
) {
  return {
    id: "probe-stress-outcome",
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

function resetStep(
  arenas: readonly ArenaStressTarget[],
) {
  return {
    id: "reset-arena-stress-fixture",
    phase: "setup" as const,
    actionId:
      "multiplayer.reset-arena-stress-fixture",
    parameters: {
      arenaIds: encodedArenaIds(arenas),
      arenaGenerations:
        encodedGenerations(arenas),
    },
  };
}

function cleanupStep(
  arenas: readonly ArenaStressTarget[],
) {
  return {
    id: "cleanup-arena-stress-fixture",
    phase: "teardown" as const,
    actionId:
      "multiplayer.cleanup-arena-stress-fixture",
    parameters: {
      arenaIds: encodedArenaIds(arenas),
    },
  };
}

function perArenaEvidence(
  arenas: readonly ArenaStressTarget[],
  predicateId: string,
  measurementKey?: string,
  measurementValue?: number,
): RuntimeExperimentEvidenceRequirement[] {
  return arenas.map((arena) => ({
    id:
      predicateId +
      ":" +
      arena.arenaId,
    predicateId,
    state: "present" as const,
    scope: {
      arenaId: arena.arenaId,
      arenaGeneration:
        arena.arenaGeneration,
    },
    ...(measurementKey === undefined ||
    measurementValue === undefined
      ? {}
      : {
          measurements: {
            [measurementKey]: {
              equals: measurementValue,
            },
          },
        }),
  }));
}

export function createAllArenaStartStressExperiment(
  input: AllArenaStressExperimentInput,
): RuntimeExperimentDefinition {
  if (input.arenas.length < 2) {
    throw new Error(
      "All-arena start stress requires at least two arenas.",
    );
  }

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
      resetStep(input.arenas),
      {
        id: "execute-all-arena-start-burst",
        phase: "stimulus",
        actionId:
          "multiplayer.execute-all-arena-start-burst",
        parameters: {
          arenaIds:
            encodedArenaIds(input.arenas),
          arenaGenerations:
            encodedGenerations(input.arenas),
          playerCountPerArena:
            input.playerCountPerArena,
          startOwnershipGuardEnabled:
            "$factor.start-ownership-guard-enabled",
        },
      },
      scoreProbe(
        input,
        "arena-start-ownership-violation-observed",
      ),
      cleanupStep(input.arenas),
    ],
    factors: [{
      id: "start-ownership-guard-enabled",
      description:
        "Whether each arena generation has an independent single-owner start transaction during all-arena contention.",
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
    evidenceRequirements: [
      ...perArenaEvidence(
        input.arenas,
        "arena-start-request-burst-observed",
        "playerCount",
        input.playerCountPerArena,
      ),
      ...input.arenas.map((arena) => ({
        id:
          "single-start-owner:" +
          arena.arenaId,
        predicateId:
          "arena-start-owner-count-sampled",
        state: "present" as const,
        armIds: ["control"],
        scope: {
          arenaId: arena.arenaId,
          arenaGeneration:
            arena.arenaGeneration,
        },
        measurements: {
          owners: { equals: 1 },
        },
      })),
    ],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

export function createAllArenaFinishStressExperiment(
  input: AllArenaStressExperimentInput,
): RuntimeExperimentDefinition {
  if (input.arenas.length < 2) {
    throw new Error(
      "All-arena finish stress requires at least two arenas.",
    );
  }

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
      resetStep(input.arenas),
      {
        id: "execute-all-arena-finish-burst",
        phase: "stimulus",
        actionId:
          "multiplayer.execute-all-arena-finish-burst",
        parameters: {
          arenaIds:
            encodedArenaIds(input.arenas),
          arenaGenerations:
            encodedGenerations(input.arenas),
          playerCountPerArena:
            input.playerCountPerArena,
        },
      },
      scoreProbe(
        input,
        "arena-cleanup-scope-violation-observed",
      ),
      cleanupStep(input.arenas),
    ],
    factors: [],
    arms: [{
      id: "baseline",
      role: "control",
      factorValues: {},
    }],
    outcomePredicateIds: [
      "arena-cleanup-scope-violation-observed",
    ],
    evidenceRequirements: [
      ...perArenaEvidence(
        input.arenas,
        "arena-session-cleanup-complete",
      ),
      ...perArenaEvidence(
        input.arenas,
        "arena-participants-returned-lobby",
        "returnedPlayers",
        input.playerCountPerArena,
      ),
      ...perArenaEvidence(
        input.arenas,
        "arena-post-cleanup-membership-empty",
      ),
    ],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

export function createCleanupStartOverlapExperiment(
  input: CleanupStartOverlapExperimentInput,
): RuntimeExperimentDefinition {
  if (
    input.endingArena.arenaId ===
    input.startingArena.arenaId
  ) {
    throw new Error(
      "Cleanup/start overlap requires two distinct arenas.",
    );
  }

  const arenas = [
    input.endingArena,
    input.startingArena,
  ];

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
      resetStep(arenas),
      {
        id: "execute-cleanup-start-overlap",
        phase: "stimulus",
        actionId:
          "multiplayer.execute-cleanup-start-overlap",
        parameters: {
          endingArenaId:
            input.endingArena.arenaId,
          endingArenaGeneration:
            input.endingArena.arenaGeneration,
          startingArenaId:
            input.startingArena.arenaId,
          startingArenaGeneration:
            input.startingArena.arenaGeneration,
          startingPlayerCount:
            input.playerCountStartingArena,
        },
      },
      scoreProbe(
        input,
        "arena-cross-scope-cleanup-observed",
      ),
      cleanupStep(arenas),
    ],
    factors: [],
    arms: [{
      id: "baseline",
      role: "control",
      factorValues: {},
    }],
    outcomePredicateIds: [
      "arena-cross-scope-cleanup-observed",
    ],
    evidenceRequirements: [{
      id: "ending-cleanup-complete",
      predicateId:
        "arena-session-cleanup-complete",
      state: "present",
      scope: {
        arenaId:
          input.endingArena.arenaId,
        arenaGeneration:
          input.endingArena.arenaGeneration,
      },
    }, {
      id: "starting-session-started",
      predicateId: "arena-session-started",
      state: "present",
      scope: {
        arenaId:
          input.startingArena.arenaId,
        arenaGeneration:
          input.startingArena.arenaGeneration,
      },
      measurements: {
        activePlayers: {
          equals:
            input.playerCountStartingArena,
        },
      },
    }, {
      id: "starting-membership-preserved",
      predicateId:
        "arena-membership-count-sampled",
      state: "present",
      scope: {
        arenaId:
          input.startingArena.arenaId,
        arenaGeneration:
          input.startingArena.arenaGeneration,
      },
      measurements: {
        activePlayers: {
          equals:
            input.playerCountStartingArena,
        },
      },
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}


export function createStaggeredFullJoinStressExperiment(
  input: AllArenaStressExperimentInput,
): RuntimeExperimentDefinition {
  if (input.arenas.length < 1) {
    throw new Error(
      "Staggered full join stress requires at least one arena.",
    );
  }

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
      resetStep(input.arenas),
      {
        id: "execute-staggered-full-join",
        phase: "stimulus",
        actionId:
          "multiplayer.execute-staggered-full-join",
        parameters: {
          arenaIds:
            encodedArenaIds(input.arenas),
          arenaGenerations:
            encodedGenerations(input.arenas),
          playersPerArena:
            input.playerCountPerArena,
          joinSpacingTicks: 1,
        },
      },
      scoreProbe(
        input,
        "arena-session-invariant-violation-observed",
      ),
      cleanupStep(input.arenas),
    ],
    factors: [],
    arms: [{
      id: "baseline",
      role: "control",
      factorValues: {},
    }],
    outcomePredicateIds: [
      "arena-session-invariant-violation-observed",
    ],
    evidenceRequirements: [
      ...perArenaEvidence(
        input.arenas,
        "arena-staggered-join-complete",
      ),
      ...perArenaEvidence(
        input.arenas,
        "arena-membership-count-sampled",
        "activePlayers",
        input.playerCountPerArena,
      ),
    ],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

function playerDisconnectExperiment(
  input: PlayerDisconnectStressExperimentInput,
  phase: "setup" | "active",
): RuntimeExperimentDefinition {
  const actionId =
    phase === "setup"
      ? "multiplayer.execute-disconnect-during-setup"
      : "multiplayer.execute-disconnect-during-active";
  const outcome =
    phase === "setup"
      ? "stale-session-mutation-observed"
      : "arena-session-invariant-violation-observed";
  const reconciliationPredicate =
    phase === "setup"
      ? "arena-pending-setup-invalidated"
      : "arena-active-disconnect-reconciled";

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
      id: "reset-arena-stress-fixture",
      phase: "setup",
      actionId:
        "multiplayer.reset-arena-stress-fixture",
      parameters: {
        arenaIds: input.subject.arenaId,
        arenaGenerations:
          String(input.subject.arenaGeneration),
      },
    }, {
      id:
        phase === "setup"
          ? "disconnect-during-setup"
          : "disconnect-during-active",
      phase: "stimulus",
      actionId,
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
    }, scoreProbe(input, outcome), {
      id: "cleanup-arena-stress-fixture",
      phase: "teardown",
      actionId:
        "multiplayer.cleanup-arena-stress-fixture",
      parameters: {
        arenaIds: input.subject.arenaId,
      },
    }],
    factors: [],
    arms: [{
      id: "baseline",
      role: "control",
      factorValues: {},
    }],
    outcomePredicateIds: [outcome],
    evidenceRequirements: [{
      id: "player-disconnected",
      predicateId: "player-disconnected",
      state: "present",
      scope: {
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
    }, {
      id: "session-progress-reset",
      predicateId: "session-progress-reset",
      state: "present",
      scope: {
        playerKey: input.subject.playerKey,
        arenaId: input.subject.arenaId,
        arenaGeneration:
          input.subject.arenaGeneration,
      },
    }, {
      id: "disconnect-reconciled",
      predicateId: reconciliationPredicate,
      state: "present",
      scope: {
        playerKey: input.subject.playerKey,
        arenaId: input.subject.arenaId,
        arenaGeneration:
          input.subject.arenaGeneration,
      },
    }],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}

export function createDisconnectDuringSetupStressExperiment(
  input: PlayerDisconnectStressExperimentInput,
): RuntimeExperimentDefinition {
  return playerDisconnectExperiment(
    input,
    "setup",
  );
}

export function createDisconnectDuringActiveStressExperiment(
  input: PlayerDisconnectStressExperimentInput,
): RuntimeExperimentDefinition {
  return playerDisconnectExperiment(
    input,
    "active",
  );
}
