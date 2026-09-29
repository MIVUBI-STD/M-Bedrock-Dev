import type { ArenaRegionVolume } from "./arena-region.js";

export interface ArenaRegionPartitionResult {
  volumes: readonly ArenaRegionVolume[];
  excludedBlocks: number;
  partitionCount: number;
  truncated: boolean;
}

function normalized(volume: ArenaRegionVolume): ArenaRegionVolume {
  return {
    min: {
      x: Math.min(volume.min.x, volume.max.x),
      y: Math.min(volume.min.y, volume.max.y),
      z: Math.min(volume.min.z, volume.max.z),
    },
    max: {
      x: Math.max(volume.min.x, volume.max.x),
      y: Math.max(volume.min.y, volume.max.y),
      z: Math.max(volume.min.z, volume.max.z),
    },
    evidenceCandidateIds: [...volume.evidenceCandidateIds],
  };
}

function count(volume: ArenaRegionVolume): number {
  return (
    (volume.max.x - volume.min.x + 1) *
    (volume.max.y - volume.min.y + 1) *
    (volume.max.z - volume.min.z + 1)
  );
}

export function intersectArenaRegionVolumes(
  left: ArenaRegionVolume,
  right: ArenaRegionVolume,
): ArenaRegionVolume | undefined {
  const a = normalized(left);
  const b = normalized(right);
  const min = {
    x: Math.max(a.min.x, b.min.x),
    y: Math.max(a.min.y, b.min.y),
    z: Math.max(a.min.z, b.min.z),
  };
  const max = {
    x: Math.min(a.max.x, b.max.x),
    y: Math.min(a.max.y, b.max.y),
    z: Math.min(a.max.z, b.max.z),
  };

  if (min.x > max.x || min.y > max.y || min.z > max.z) {
    return undefined;
  }

  return {
    min,
    max,
    evidenceCandidateIds: [
      ...new Set([
        ...a.evidenceCandidateIds,
        ...b.evidenceCandidateIds,
      ]),
    ].sort(),
  };
}

export function subtractArenaRegionVolume(
  source: ArenaRegionVolume,
  cut: ArenaRegionVolume,
): ArenaRegionVolume[] {
  const base = normalized(source);
  const intersection = intersectArenaRegionVolumes(base, cut);
  if (!intersection) return [base];

  const output: ArenaRegionVolume[] = [];
  const evidenceCandidateIds = [...base.evidenceCandidateIds];

  if (base.min.x < intersection.min.x) {
    output.push({
      min: base.min,
      max: {
        x: intersection.min.x - 1,
        y: base.max.y,
        z: base.max.z,
      },
      evidenceCandidateIds,
    });
  }

  if (intersection.max.x < base.max.x) {
    output.push({
      min: {
        x: intersection.max.x + 1,
        y: base.min.y,
        z: base.min.z,
      },
      max: base.max,
      evidenceCandidateIds,
    });
  }

  const middleMinX = intersection.min.x;
  const middleMaxX = intersection.max.x;

  if (base.min.y < intersection.min.y) {
    output.push({
      min: {
        x: middleMinX,
        y: base.min.y,
        z: base.min.z,
      },
      max: {
        x: middleMaxX,
        y: intersection.min.y - 1,
        z: base.max.z,
      },
      evidenceCandidateIds,
    });
  }

  if (intersection.max.y < base.max.y) {
    output.push({
      min: {
        x: middleMinX,
        y: intersection.max.y + 1,
        z: base.min.z,
      },
      max: {
        x: middleMaxX,
        y: base.max.y,
        z: base.max.z,
      },
      evidenceCandidateIds,
    });
  }

  const middleMinY = intersection.min.y;
  const middleMaxY = intersection.max.y;

  if (base.min.z < intersection.min.z) {
    output.push({
      min: {
        x: middleMinX,
        y: middleMinY,
        z: base.min.z,
      },
      max: {
        x: middleMaxX,
        y: middleMaxY,
        z: intersection.min.z - 1,
      },
      evidenceCandidateIds,
    });
  }

  if (intersection.max.z < base.max.z) {
    output.push({
      min: {
        x: middleMinX,
        y: middleMinY,
        z: intersection.max.z + 1,
      },
      max: {
        x: middleMaxX,
        y: middleMaxY,
        z: base.max.z,
      },
      evidenceCandidateIds,
    });
  }

  return output;
}

export function partitionArenaProofVolumes(
  sourceVolumes: readonly ArenaRegionVolume[],
  excludedVolumes: readonly ArenaRegionVolume[],
  options: { maxPartitions?: number } = {},
): ArenaRegionPartitionResult {
  const maxPartitions = options.maxPartitions ?? 256;
  let volumes = sourceVolumes.map(normalized);
  let excludedBlocks = 0;

  for (const cut of excludedVolumes) {
    const next: ArenaRegionVolume[] = [];
    for (const volume of volumes) {
      const intersection = intersectArenaRegionVolumes(volume, cut);
      if (!intersection) {
        next.push(volume);
        continue;
      }

      excludedBlocks += count(intersection);
      next.push(...subtractArenaRegionVolume(volume, cut));

      if (next.length > maxPartitions) {
        return {
          volumes: sourceVolumes.map(normalized),
          excludedBlocks: 0,
          partitionCount: sourceVolumes.length,
          truncated: true,
        };
      }
    }
    volumes = next;
  }

  return {
    volumes,
    excludedBlocks,
    partitionCount: volumes.length,
    truncated: false,
  };
}
