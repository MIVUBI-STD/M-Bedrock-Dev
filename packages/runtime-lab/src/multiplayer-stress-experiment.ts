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
