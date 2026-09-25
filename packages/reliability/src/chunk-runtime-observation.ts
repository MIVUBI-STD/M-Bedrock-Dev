export interface ChunkRuntimeVector3 {
  x: number;
  y: number;
  z: number;
}

export interface ChunkRuntimeTarget {
  targetId: string;
  dimensionId: string;
  location: ChunkRuntimeVector3;
}

export type ChunkRuntimeReadinessState =
  | "loaded"
  | "unloaded"
  | "unknown";

export interface ChunkRuntimeObservation {
  targetId: string;
  dimensionId: string;
  location: ChunkRuntimeVector3;
  chunkX: number;
  chunkZ: number;
  state: ChunkRuntimeReadinessState;
}

export interface ChunkRuntimeObservationIssue {
  kind:
    | "dimension-unavailable"
    | "probe-unavailable"
    | "probe-error";
  targetId: string;
  dimensionId: string;
  message: string;
}

export interface ChunkRuntimeObservationResult {
  observations: ChunkRuntimeObservation[];
  issues: ChunkRuntimeObservationIssue[];
}

export interface ChunkRuntimeDimensionLike {
  isChunkLoaded?(location: ChunkRuntimeVector3): boolean;
}

export interface ChunkRuntimeWorldLike {
  getDimension(dimensionId: string): ChunkRuntimeDimensionLike;
}

function chunkCoordinate(value: number): number {
  return Math.floor(value / 16);
}

function observation(
  target: ChunkRuntimeTarget,
  state: ChunkRuntimeReadinessState,
): ChunkRuntimeObservation {
  return {
    targetId: target.targetId,
    dimensionId: target.dimensionId,
    location: { ...target.location },
    chunkX: chunkCoordinate(target.location.x),
    chunkZ: chunkCoordinate(target.location.z),
    state,
  };
}

export function captureChunkRuntimeReadiness(
  world: ChunkRuntimeWorldLike,
  targets: readonly ChunkRuntimeTarget[],
): ChunkRuntimeObservationResult {
  const observations: ChunkRuntimeObservation[] = [];
  const issues: ChunkRuntimeObservationIssue[] = [];

  for (const target of targets) {
    let dimension: ChunkRuntimeDimensionLike;
    try {
      dimension = world.getDimension(target.dimensionId);
    } catch (error) {
      observations.push(observation(target, "unknown"));
      issues.push({
        kind: "dimension-unavailable",
        targetId: target.targetId,
        dimensionId: target.dimensionId,
        message:
          "Unable to resolve target dimension: " +
          (error instanceof Error ? error.message : String(error)),
      });
      continue;
    }

    if (typeof dimension.isChunkLoaded !== "function") {
      observations.push(observation(target, "unknown"));
      issues.push({
        kind: "probe-unavailable",
        targetId: target.targetId,
        dimensionId: target.dimensionId,
        message:
          "Dimension.isChunkLoaded is unavailable; readiness remains unknown.",
      });
      continue;
    }

    try {
      observations.push(
        observation(
          target,
          dimension.isChunkLoaded(target.location) ? "loaded" : "unloaded",
        ),
      );
    } catch (error) {
      observations.push(observation(target, "unknown"));
      issues.push({
        kind: "probe-error",
        targetId: target.targetId,
        dimensionId: target.dimensionId,
        message:
          "Chunk readiness probe failed: " +
          (error instanceof Error ? error.message : String(error)),
      });
    }
  }

  return { observations, issues };
}

export function allChunkTargetsReady(
  result: ChunkRuntimeObservationResult,
): boolean {
  return (
    result.observations.length > 0 &&
    result.issues.length === 0 &&
    result.observations.every((item) => item.state === "loaded")
  );
}
