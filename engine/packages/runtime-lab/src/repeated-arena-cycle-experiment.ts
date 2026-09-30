import type {
  RuntimeActionCapability,
  RuntimeActionCapabilityRegistry,
} from "./action-capability.js";
import type {
  RuntimeExperimentDefinition,
  RuntimeExperimentEvidenceRequirement,
} from "./types.js";

export interface RepeatedArenaCycleTarget {
  arenaId: string;
  arenaGeneration: number;
}

export interface RepeatedArenaCycleExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  arenas: readonly RepeatedArenaCycleTarget[];
  playersPerArena: number;
  cycles: number;
  scope: "single-arena" | "all-arenas";
  compareSurfaces: readonly string[];
  preservationInvariantIds?: readonly string[];
  minimumRunsPerArm?: number;
}

export const REPEATED_ARENA_CYCLE_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] = [{
    id: "multiplayer.capture-arena-baseline",
    description:
      "Capture a generation-scoped baseline snapshot for repeated arena cleanup validation.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["setup"],
    requiredParameters: {
      arenaIds: "string",
      arenaGenerations: "string",
      compareSurfaces: "string",
    },
  }, {
    id: "multiplayer.execute-repeated-arena-cycles",
    description:
      "Execute a bounded number of full arena sessions and cleanup cycles using explicit arena generations.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      arenaIds: "string",
      arenaGenerations: "string",
      playersPerArena: "number",
      cycles: "number",
      scope: "string",
    },
  }, {
    id: "multiplayer.compare-arena-baseline",
    description:
      "Compare current arena/session residue against the captured generation-scoped baseline after repeated cycles.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "read-only",
    phases: ["observe"],
    requiredParameters: {
      arenaIds: "string",
      arenaGenerations: "string",
      compareSurfaces: "string",
      expectedCycles: "number",
    },
  }, {
    id: "multiplayer.cleanup-repeated-cycle-fixture",
    description:
      "Return repeated-cycle fixture state to the declared baseline.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["teardown"],
    requiredParameters: {
      arenaIds: "string",
    },
  }];

export const REPEATED_ARENA_CYCLE_CAPABILITY_REGISTRY:
  RuntimeActionCapabilityRegistry = {
    schemaVersion: 1,
    actions: REPEATED_ARENA_CYCLE_ACTION_CAPABILITIES,
  };

function ids(
  arenas: readonly RepeatedArenaCycleTarget[],
): string {
  return arenas
    .map((item) => item.arenaId)
    .join(",");
}

function generations(
  arenas: readonly RepeatedArenaCycleTarget[],
): string {
  return arenas
    .map((item) => String(item.arenaGeneration))
    .join(",");
}

function surfaceList(
  surfaces: readonly string[],
): string {
  return [...new Set(surfaces)]
    .sort()
    .join(",");
}

function perArenaEvidence(
  input: RepeatedArenaCycleExperimentInput,
): RuntimeExperimentEvidenceRequirement[] {
  return input.arenas.flatMap(
    (arena): RuntimeExperimentEvidenceRequirement[] => [{
      id:
        "cycles-complete:" +
        arena.arenaId,
      predicateId:
        "arena-repeated-cycle-complete",
      state: "present",
      scope: {
        arenaId: arena.arenaId,
        arenaGeneration:
          arena.arenaGeneration,
      },
      measurements: {
        cycles: {
          equals: input.cycles,
        },
      },
    }, {
      id:
        "baseline-match:" +
        arena.arenaId,
      predicateId:
        "arena-baseline-snapshot-match",
      state: "present",
      scope: {
        arenaId: arena.arenaId,
        arenaGeneration:
          arena.arenaGeneration,
      },
    }, {
      id:
        "residue-zero:" +
        arena.arenaId,
      predicateId:
        "arena-residue-count-sampled",
      state: "present",
      scope: {
        arenaId: arena.arenaId,
        arenaGeneration:
          arena.arenaGeneration,
      },
      measurements: {
        residueCount: {
          equals: 0,
        },
      },
    }],
  );
}

export function createRepeatedArenaCycleExperiment(
  input: RepeatedArenaCycleExperimentInput,
): RuntimeExperimentDefinition {
  if (input.arenas.length === 0) {
    throw new Error(
      "Repeated arena cycle experiment requires at least one arena.",
    );
  }
  if (
    !Number.isInteger(input.cycles) ||
    input.cycles < 1
  ) {
    throw new Error(
      "Repeated arena cycle experiment cycles must be a positive integer.",
    );
  }
  if (
    input.scope === "single-arena" &&
    input.arenas.length !== 1
  ) {
    throw new Error(
      "Single-arena repeated cycle scope requires exactly one arena.",
    );
  }
  if (
    !Number.isInteger(input.playersPerArena) ||
    input.playersPerArena < 1
  ) {
    throw new Error(
      "Repeated arena cycle playersPerArena must be a positive integer.",
    );
  }

  const arenaIds = ids(input.arenas);
  const arenaGenerations =
    generations(input.arenas);
  const compareSurfaces =
    surfaceList(input.compareSurfaces);

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
      id: "capture-arena-baseline",
      phase: "setup",
      actionId:
        "multiplayer.capture-arena-baseline",
      parameters: {
        arenaIds,
        arenaGenerations,
        compareSurfaces,
      },
    }, {
      id: "execute-repeated-arena-cycles",
      phase: "stimulus",
      actionId:
        "multiplayer.execute-repeated-arena-cycles",
      parameters: {
        arenaIds,
        arenaGenerations,
        playersPerArena:
          input.playersPerArena,
        cycles: input.cycles,
        scope: input.scope,
      },
    }, {
      id: "compare-arena-baseline",
      phase: "observe",
      actionId:
        "multiplayer.compare-arena-baseline",
      parameters: {
        arenaIds,
        arenaGenerations,
        compareSurfaces,
        expectedCycles: input.cycles,
      },
    }, {
      id: "cleanup-repeated-cycle-fixture",
      phase: "teardown",
      actionId:
        "multiplayer.cleanup-repeated-cycle-fixture",
      parameters: {
        arenaIds,
      },
    }],
    factors: [],
    arms: [{
      id: "baseline",
      role: "control",
      factorValues: {},
    }],
    outcomePredicateIds: [
      "arena-baseline-snapshot-match",
      "arena-residue-count-sampled",
    ],
    evidenceRequirements:
      perArenaEvidence(input),
    ...(input.preservationInvariantIds === undefined
      ? {}
      : {
          preservationInvariantIds:
            input.preservationInvariantIds,
        }),
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 1,
  };
}
