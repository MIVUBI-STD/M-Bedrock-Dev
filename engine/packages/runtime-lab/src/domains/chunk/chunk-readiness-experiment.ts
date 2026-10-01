import type {
  RuntimeActionCapability,
  RuntimeActionCapabilityRegistry,
} from "../../core/action-capability.js";
import type {
  RuntimeExperimentDefinition,
} from "../../core/types.js";

export interface ChunkReadinessTarget {
  dimension: string;
  x: number;
  y: number;
  z: number;
}

export interface ChunkReadinessExperimentInput {
  id: string;
  title: string;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  target: ChunkReadinessTarget;
  minimumRunsPerArm?: number;
}

export const CHUNK_READINESS_ACTION_CAPABILITIES: readonly RuntimeActionCapability[] = [{
  id: "chunk.position-loader-relative-to-target",
  description:
    "Move a controlled loader player to a chunk-distance offset from the target and wait only for the action acknowledgement, not for readiness proof.",
  requiredContext: "LIVE_MINECRAFT",
  mutationRisk: "guarded",
  phases: ["stimulus"],
  requiredParameters: {
    dimension: "string",
    x: "number",
    y: "number",
    z: "number",
    distanceChunks: "number",
  },
}, {
  id: "chunk.isolate-target-from-loaders",
  description:
    "Move controlled loader players away from the target so player-driven loading is not the active treatment.",
  requiredContext: "LIVE_MINECRAFT",
  mutationRisk: "guarded",
  phases: ["setup"],
  requiredParameters: {
    dimension: "string",
    x: "number",
    y: "number",
    z: "number",
  },
}, {
  id: "chunk.set-temporary-ticking-area",
  description:
    "Create or skip a temporary namespaced ticking-area lease around the target according to the enabled factor.",
  requiredContext: "LIVE_MINECRAFT",
  mutationRisk: "guarded",
  phases: ["stimulus"],
  requiredParameters: {
    dimension: "string",
    x: "number",
    y: "number",
    z: "number",
    enabled: "boolean",
  },
}, {
  id: "chunk.clear-temporary-ticking-area",
  description:
    "Remove the temporary ticking-area lease owned by the current experiment trial.",
  requiredContext: "LIVE_MINECRAFT",
  mutationRisk: "guarded",
  phases: ["teardown"],
  requiredParameters: {
    dimension: "string",
    x: "number",
    y: "number",
    z: "number",
  },
}];

export const CHUNK_READINESS_CAPABILITY_REGISTRY:
  RuntimeActionCapabilityRegistry = {
    schemaVersion: 1,
    actions: CHUNK_READINESS_ACTION_CAPABILITIES,
  };

function minimumRuns(value: number | undefined): number {
  return value ?? 2;
}

function targetParameters(
  target: ChunkReadinessTarget,
): Readonly<Record<string, string | number>> {
  return {
    dimension: target.dimension,
    x: target.x,
    y: target.y,
    z: target.z,
  };
}

export function createPlayerLoaderChunkReadinessExperiment(
  input: ChunkReadinessExperimentInput & {
    controlDistanceChunks: number;
    treatmentDistanceChunks?: number;
  },
): RuntimeExperimentDefinition {
  const treatmentDistance =
    input.treatmentDistanceChunks ?? 0;

  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "chunks",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint:
      input.targetProfileFingerprint,
    fixtureFingerprint:
      input.fixtureFingerprint,
    protocol: [{
      id: "position-loader",
      phase: "stimulus",
      actionId:
        "chunk.position-loader-relative-to-target",
      parameters: {
        ...targetParameters(input.target),
        distanceChunks: "$factor.loader-distance-chunks",
      },
    }, {
      id: "probe-target-chunk",
      phase: "observe",
      actionId: "probe.chunk-loaded",
      parameters: {
        ...targetParameters(input.target),
        predicate: "target-chunk-ready",
      },
    }],
    factors: [{
      id: "loader-distance-chunks",
      description:
        "Controlled chunk-space distance between the loader player and target.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "loader-distance-chunks":
          input.controlDistanceChunks,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "loader-distance-chunks":
          treatmentDistance,
      },
    }],
    outcomePredicateIds: ["target-chunk-ready"],
    expectedContrasts: [{
      predicateId: "target-chunk-ready",
      controlState: "absent",
      treatmentState: "present",
    }],
    minimumRunsPerArm:
      minimumRuns(input.minimumRunsPerArm),
  };
}

export function createTickingAreaChunkRecoveryExperiment(
  input: ChunkReadinessExperimentInput,
): RuntimeExperimentDefinition {
  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    domain: "chunks",
    requiredContext: "LIVE_MINECRAFT",
    mutationRisk: "guarded",
    targetProfileFingerprint:
      input.targetProfileFingerprint,
    fixtureFingerprint:
      input.fixtureFingerprint,
    protocol: [{
      id: "isolate-target",
      phase: "setup",
      actionId: "chunk.isolate-target-from-loaders",
      parameters: targetParameters(input.target),
    }, {
      id: "apply-temporary-load",
      phase: "stimulus",
      actionId: "chunk.set-temporary-ticking-area",
      parameters: {
        ...targetParameters(input.target),
        enabled: "$factor.ticking-area-enabled",
      },
    }, {
      id: "probe-target-chunk",
      phase: "observe",
      actionId: "probe.chunk-loaded",
      parameters: {
        ...targetParameters(input.target),
        predicate: "target-chunk-ready",
      },
    }, {
      id: "cleanup-temporary-load",
      phase: "teardown",
      actionId: "chunk.clear-temporary-ticking-area",
      parameters: targetParameters(input.target),
    }],
    factors: [{
      id: "ticking-area-enabled",
      description:
        "Whether a temporary ticking-area recovery lease is active for the target.",
    }],
    arms: [{
      id: "control",
      role: "control",
      factorValues: {
        "ticking-area-enabled": false,
      },
    }, {
      id: "treatment",
      role: "treatment",
      factorValues: {
        "ticking-area-enabled": true,
      },
    }],
    outcomePredicateIds: ["target-chunk-ready"],
    expectedContrasts: [{
      predicateId: "target-chunk-ready",
      controlState: "absent",
      treatmentState: "present",
    }],
    minimumRunsPerArm:
      minimumRuns(input.minimumRunsPerArm),
  };
}
