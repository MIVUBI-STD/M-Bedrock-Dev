import type {
  RuntimeActionCapability,
  RuntimeActionCapabilityRegistry,
} from "./action-capability.js";
import type {
  RuntimeExperimentDefinition,
} from "./types.js";

export interface GlobalStateLeaseArenaTarget {
  arenaId: string;
  arenaGeneration: number;
}

export interface GlobalStateLeaseRaceExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  resource: string;
  firstOwner: GlobalStateLeaseArenaTarget;
  secondOwner: GlobalStateLeaseArenaTarget;
  firstValue: string;
  secondValue: string;
  baselineValue: string;
  minimumRunsPerArm?: number;
}

export const GLOBAL_STATE_LEASE_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] = [{
    id: "worldstate.capture-baseline",
    description:
      "Capture the current value and ownership metadata for one world-global resource before lease contention.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "read-only",
    phases: ["setup"],
    requiredParameters: {
      resource: "string",
      baselineValue: "string",
    },
  }, {
    id: "worldstate.acquire-lease",
    description:
      "Acquire a generation-scoped world-global resource lease and apply the requested value.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      resource: "string",
      arenaId: "string",
      arenaGeneration: "number",
      value: "string",
    },
  }, {
    id: "worldstate.cleanup-owner",
    description:
      "Run owner cleanup/restore logic for one generation-scoped world-global lease.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      resource: "string",
      arenaId: "string",
      arenaGeneration: "number",
    },
  }, {
    id: "worldstate.observe-lease",
    description:
      "Observe world-global value, current owner, and stale-restore rejection state.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "read-only",
    phases: ["observe"],
    requiredParameters: {
      resource: "string",
    },
  }, {
    id: "worldstate.restore-baseline",
    description:
      "Release the final owner and restore the captured baseline value for one world-global resource.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["teardown"],
    requiredParameters: {
      resource: "string",
      expectedOwnerArenaId: "string",
      expectedOwnerArenaGeneration: "number",
    },
  }];

export const GLOBAL_STATE_LEASE_CAPABILITY_REGISTRY:
  RuntimeActionCapabilityRegistry = {
    schemaVersion: 1,
    actions: GLOBAL_STATE_LEASE_ACTION_CAPABILITIES,
  };

export function createGlobalStateLeaseRaceExperiment(
  input: GlobalStateLeaseRaceExperimentInput,
): RuntimeExperimentDefinition {
  if (
    input.firstOwner.arenaId ===
    input.secondOwner.arenaId
  ) {
    throw new Error(
      "Global state lease race requires two distinct arenas.",
    );
  }

  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "state",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint:
      input.targetProfileFingerprint,
    fixtureFingerprint:
      input.fixtureFingerprint,
    protocol: [{
      id: "capture-global-baseline",
      phase: "setup",
      actionId: "worldstate.capture-baseline",
      parameters: {
        resource: input.resource,
        baselineValue:
          input.baselineValue,
      },
    }, {
      id: "owner-a-acquire",
      phase: "stimulus",
      actionId: "worldstate.acquire-lease",
      parameters: {
        resource: input.resource,
        arenaId: input.firstOwner.arenaId,
        arenaGeneration:
          input.firstOwner.arenaGeneration,
        value: input.firstValue,
      },
    }, {
      id: "owner-b-takeover",
      phase: "stimulus",
      actionId: "worldstate.acquire-lease",
      parameters: {
        resource: input.resource,
        arenaId: input.secondOwner.arenaId,
        arenaGeneration:
          input.secondOwner.arenaGeneration,
        value: input.secondValue,
      },
    }, {
      id: "cleanup-old-owner",
      phase: "stimulus",
      actionId: "worldstate.cleanup-owner",
      parameters: {
        resource: input.resource,
        arenaId: input.firstOwner.arenaId,
        arenaGeneration:
          input.firstOwner.arenaGeneration,
      },
    }, {
      id: "observe-after-stale-cleanup",
      phase: "observe",
      actionId: "worldstate.observe-lease",
      parameters: {
        resource: input.resource,
      },
    }, {
      id: "restore-final-baseline",
      phase: "teardown",
      actionId: "worldstate.restore-baseline",
      parameters: {
        resource: input.resource,
        expectedOwnerArenaId:
          input.secondOwner.arenaId,
        expectedOwnerArenaGeneration:
          input.secondOwner.arenaGeneration,
      },
    }],
    factors: [],
    arms: [{
      id: "baseline",
      role: "control",
      factorValues: {},
    }],
    outcomePredicateIds: [
      "worldstate-stale-restore-blocked",
      "worldstate-final-baseline-restored",
    ],
    evidenceRequirements: [{
      id: "second-owner-preserved",
      predicateId:
        "worldstate-current-owner",
      state: "present",
      scope: {
        arenaId:
          input.secondOwner.arenaId,
        arenaGeneration:
          input.secondOwner.arenaGeneration,
      },
    }, {
      id: "second-value-preserved",
      predicateId:
        "worldstate-current-value",
      state: "present",
      scope: {
        arenaId:
          input.secondOwner.arenaId,
        arenaGeneration:
          input.secondOwner.arenaGeneration,
      },
      measurements: {
        matchesExpected: {
          equals: 1,
        },
      },
    }, {
      id: "stale-restore-blocked",
      predicateId:
        "worldstate-stale-restore-blocked",
      state: "present",
      scope: {
        arenaId:
          input.firstOwner.arenaId,
        arenaGeneration:
          input.firstOwner.arenaGeneration,
      },
    }, {
      id: "baseline-restored",
      predicateId:
        "worldstate-final-baseline-restored",
      state: "present",
    }],
    preservationInvariantIds: [
      "worldstate.owner-token-guards-restore",
      "worldstate.newer-owner-survives-stale-cleanup",
      "worldstate.final-owner-restores-baseline",
    ],
    minimumRunsPerArm:
      input.minimumRunsPerArm ?? 2,
  };
}
