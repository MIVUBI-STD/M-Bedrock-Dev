import type {
  RuntimeActionCapability,
} from "../../core/action-capability.js";
import type { RuntimeExperimentDefinition } from "../../core/types.js";

export interface ChunkLifecycleExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  dimension: string;
  x: number;
  y: number;
  z: number;
  minimumRunsPerArm?: number;
}

export const CHUNK_LIFECYCLE_ACTION_CAPABILITIES:
  readonly RuntimeActionCapability[] = [{
    id: "chunk.configure-simulation-fixture",
    description:
      "Configure a controlled player mode and loader distance for simulation-boundary observation.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      dimension: "string",
      x: "number",
      y: "number",
      z: "number",
      distanceChunks: "number",
      spectator: "boolean",
    },
  }, {
    id: "chunk.schedule-area-loaded-fixture",
    description:
      "Schedule a controlled area-loaded callback and record callback execution separately from chunk loading authority.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      dimension: "string",
      x: "number",
      y: "number",
      z: "number",
      callbackId: "string",
    },
  }, {
    id: "chunk.reset-entity-lifecycle-fixture",
    description:
      "Reset the controlled entity lifecycle fixture and spawn the declared persistent/transient subject.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["setup"],
    requiredParameters: {
      entityKey: "string",
      persistent: "boolean",
      dimension: "string",
      x: "number",
      y: "number",
      z: "number",
    },
  }, {
    id: "chunk.reload-entity-lifecycle-fixture",
    description:
      "Reload the controlled world/runtime boundary used to test entity identity and persistence.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["stimulus"],
    requiredParameters: {
      entityKey: "string",
    },
  }, {
    id: "chunk.cleanup-lifecycle-fixture",
    description:
      "Remove controlled simulation, scheduler, and entity-lifecycle fixture state.",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    phases: ["teardown"],
    requiredParameters: {
      fixtureId: "string",
    },
  }];

function base(input: ChunkLifecycleExperimentInput) {
  return {
    dimension: input.dimension,
    x: input.x,
    y: input.y,
    z: input.z,
  };
}

export function createDimensionGeometryExperiment(
  input: ChunkLifecycleExperimentInput,
): RuntimeExperimentDefinition {
  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "chunks",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "read-only",
    targetProfileFingerprint: input.targetProfileFingerprint,
    fixtureFingerprint: input.fixtureFingerprint,
    protocol: [{
      id: "probe-height-range",
      phase: "observe",
      actionId: "probe.dimension-height-range",
      parameters: {
        dimension: input.dimension,
        predicate: "dimension-height-range-observed",
      },
    }, {
      id: "probe-chunk",
      phase: "observe",
      actionId: "probe.chunk-loaded",
      parameters: {
        ...base(input),
        predicate: "chunk-coordinate-mapping-observed",
      },
    }],
    factors: [],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {},
    }],
    outcomePredicateIds: [
      "dimension-height-range-observed",
      "chunk-coordinate-mapping-observed",
    ],
    minimumRunsPerArm: input.minimumRunsPerArm ?? 2,
  };
}

export function createSimulationBoundaryExperiment(
  input: ChunkLifecycleExperimentInput & {
    controlDistanceChunks: number;
    treatmentDistanceChunks: number;
  },
): RuntimeExperimentDefinition {
  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "chunks",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint: input.targetProfileFingerprint,
    fixtureFingerprint: input.fixtureFingerprint,
    protocol: [{
      id: "configure-simulation",
      phase: "stimulus",
      actionId: "chunk.configure-simulation-fixture",
      parameters: {
        ...base(input),
        distanceChunks: "$factor.distance-chunks",
        spectator: "$factor.spectator",
      },
    }, {
      id: "probe-loaded",
      phase: "observe",
      actionId: "probe.chunk-loaded",
      parameters: {
        ...base(input),
        predicate: "simulation-target-loaded",
      },
    }, {
      id: "cleanup",
      phase: "teardown",
      actionId: "chunk.cleanup-lifecycle-fixture",
      parameters: { fixtureId: input.id },
    }],
    factors: [
      { id: "distance-chunks", description: "Loader distance in chunks." },
      { id: "spectator", description: "Whether the controlled loader is spectator." },
    ],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "distance-chunks": input.controlDistanceChunks,
        spectator: false,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "distance-chunks": input.treatmentDistanceChunks,
        spectator: true,
      },
    }],
    outcomePredicateIds: ["simulation-target-loaded"],
    minimumRunsPerArm: input.minimumRunsPerArm ?? 2,
  };
}

export function createAreaLoadedSchedulerExperiment(
  input: ChunkLifecycleExperimentInput,
): RuntimeExperimentDefinition {
  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "scheduler",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint: input.targetProfileFingerprint,
    fixtureFingerprint: input.fixtureFingerprint,
    protocol: [{
      id: "isolate-target",
      phase: "setup",
      actionId: "chunk.isolate-target-from-loaders",
      parameters: base(input),
    }, {
      id: "schedule-callback",
      phase: "stimulus",
      actionId: "chunk.schedule-area-loaded-fixture",
      parameters: {
        ...base(input),
        callbackId: input.id,
      },
    }, {
      id: "probe-loaded",
      phase: "observe",
      actionId: "probe.chunk-loaded",
      parameters: {
        ...base(input),
        predicate: "target-chunk-ready",
      },
    }, {
      id: "cleanup",
      phase: "teardown",
      actionId: "chunk.cleanup-lifecycle-fixture",
      parameters: { fixtureId: input.id },
    }],
    factors: [],
    arms: [{ id: "control", role: "control", factorValues: {} }],
    outcomePredicateIds: [
      "area-loaded-callback-observed",
      "target-chunk-ready",
    ],
    evidenceRequirements: [{
      id: "callback-observed",
      predicateId: "area-loaded-callback-observed",
      state: "present",
      minimumProofAuthority: "live-runtime",
    }],
    minimumRunsPerArm: input.minimumRunsPerArm ?? 2,
  };
}

export function createEntityPersistenceLifecycleExperiment(
  input: ChunkLifecycleExperimentInput & {
    entityKey: string;
  },
): RuntimeExperimentDefinition {
  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "entity-lifecycle",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint: input.targetProfileFingerprint,
    fixtureFingerprint: input.fixtureFingerprint,
    protocol: [{
      id: "reset-subject",
      phase: "setup",
      actionId: "chunk.reset-entity-lifecycle-fixture",
      parameters: {
        entityKey: input.entityKey,
        persistent: "$factor.persistent",
        ...base(input),
      },
    }, {
      id: "reload",
      phase: "stimulus",
      actionId: "chunk.reload-entity-lifecycle-fixture",
      parameters: { entityKey: input.entityKey },
    }, {
      id: "probe-resolvable",
      phase: "observe",
      actionId: "probe.entity-resolvable",
      parameters: {
        entityId: input.entityKey,
        predicate: "entity-resolvable-after-reload",
      },
    }, {
      id: "probe-location",
      phase: "observe",
      actionId: "probe.entity-location",
      parameters: {
        entityId: input.entityKey,
        dimension: input.dimension,
        predicate: "entity-location-after-reload",
      },
    }, {
      id: "cleanup",
      phase: "teardown",
      actionId: "chunk.cleanup-lifecycle-fixture",
      parameters: { fixtureId: input.id },
    }],
    factors: [{
      id: "persistent",
      description: "Whether the controlled entity receives the persistent lifecycle component.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: { persistent: true },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: { persistent: false },
    }],
    outcomePredicateIds: [
      "entity-resolvable-after-reload",
      "entity-location-after-reload",
    ],
    minimumRunsPerArm: input.minimumRunsPerArm ?? 2,
  };
}
