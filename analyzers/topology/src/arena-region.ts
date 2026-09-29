import type { ArenaReplicaDiscovery } from "./arena-discovery.js";
import type { ArenaVector3 } from "./arena-replica.js";
import type { TopologyCandidate } from "./candidates.js";
import type { ResolvedEffect } from "./effect-resolution.js";

export interface ArenaRegionVolume {
  min: ArenaVector3;
  max: ArenaVector3;
  evidenceCandidateIds: readonly string[];
}

export interface ArenaRegionPlan {
  volumes: readonly ArenaRegionVolume[];
  boundingBox: {
    min: ArenaVector3;
    max: ArenaVector3;
  };
  totalBlocks: number;
  evidenceCandidates: number;
  mergeGapBlocks: number;
  confidence: "low" | "medium" | "high";
}

export interface ArenaRegionInferenceOptions {
  marginBlocks?: number;
  mergeGapBlocks?: number;
  maxVolumeBlocks?: number;
}

function minPoint(a: ArenaVector3, b: ArenaVector3): ArenaVector3 {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    z: Math.min(a.z, b.z),
  };
}

function maxPoint(a: ArenaVector3, b: ArenaVector3): ArenaVector3 {
  return {
    x: Math.max(a.x, b.x),
    y: Math.max(a.y, b.y),
    z: Math.max(a.z, b.z),
  };
}

function translatedBox(
  from: ArenaVector3,
  to: ArenaVector3,
  destination: ArenaVector3,
): { min: ArenaVector3; max: ArenaVector3 } {
  const sourceMin = minPoint(from, to);
  const sourceMax = maxPoint(from, to);
  return {
    min: destination,
    max: {
      x: destination.x + (sourceMax.x - sourceMin.x),
      y: destination.y + (sourceMax.y - sourceMin.y),
      z: destination.z + (sourceMax.z - sourceMin.z),
    },
  };
}

function boundsForEffect(
  effect: ResolvedEffect,
): { min: ArenaVector3; max: ArenaVector3 } {
  if (effect.kind === "fill") {
    return {
      min: minPoint(effect.from, effect.to),
      max: maxPoint(effect.from, effect.to),
    };
  }

  if (effect.kind === "clone") {
    return translatedBox(effect.from, effect.to, effect.destination);
  }

  if (effect.kind === "setblock" || effect.kind === "entity-spawn") {
    return { min: effect.position, max: effect.position };
  }

  return { min: effect.destination, max: effect.destination };
}

function expand(
  box: { min: ArenaVector3; max: ArenaVector3 },
  margin: number,
): { min: ArenaVector3; max: ArenaVector3 } {
  return {
    min: {
      x: Math.floor(box.min.x) - margin,
      y: Math.floor(box.min.y) - margin,
      z: Math.floor(box.min.z) - margin,
    },
    max: {
      x: Math.ceil(box.max.x) + margin,
      y: Math.ceil(box.max.y) + margin,
      z: Math.ceil(box.max.z) + margin,
    },
  };
}

function nearOrOverlapping(
  a: ArenaRegionVolume,
  b: ArenaRegionVolume,
  gap: number,
): boolean {
  return !(
    a.max.x + gap < b.min.x ||
    b.max.x + gap < a.min.x ||
    a.max.y + gap < b.min.y ||
    b.max.y + gap < a.min.y ||
    a.max.z + gap < b.min.z ||
    b.max.z + gap < a.min.z
  );
}

function merge(
  a: ArenaRegionVolume,
  b: ArenaRegionVolume,
): ArenaRegionVolume {
  return {
    min: minPoint(a.min, b.min),
    max: maxPoint(a.max, b.max),
    evidenceCandidateIds: [
      ...new Set([
        ...a.evidenceCandidateIds,
        ...b.evidenceCandidateIds,
      ]),
    ].sort(),
  };
}

function blockCount(volume: ArenaRegionVolume): number {
  return (
    (volume.max.x - volume.min.x + 1) *
    (volume.max.y - volume.min.y + 1) *
    (volume.max.z - volume.min.z + 1)
  );
}

function offsetKey(offset: { x: number; y: number; z: number }): string {
  return `${offset.x},${offset.y},${offset.z}`;
}

export function inferArenaRegionPlan(
  effects: readonly ResolvedEffect[],
  candidates: readonly TopologyCandidate[],
  discovery: ArenaReplicaDiscovery,
  options: ArenaRegionInferenceOptions = {},
): ArenaRegionPlan | undefined {
  const margin = options.marginBlocks ?? 4;
  const mergeGap = options.mergeGapBlocks ?? 12;
  const maxVolumeBlocks = options.maxVolumeBlocks ?? 500_000;
  const supportedOffsets = new Set(
    discovery.offsets.map(offsetKey),
  );

  const supportedCandidates = candidates.filter((candidate) =>
    candidate.baseEffectIndex >= 0 &&
    candidate.baseEffectIndex < effects.length &&
    candidate.members.some((member) =>
      supportedOffsets.has(offsetKey(member.translationFromBase))
    )
  );

  if (supportedCandidates.length === 0) return undefined;

  let volumes: ArenaRegionVolume[] = supportedCandidates.map((candidate) => {
    const effect = effects[candidate.baseEffectIndex]!;
    const box = expand(boundsForEffect(effect), margin);
    return {
      min: box.min,
      max: box.max,
      evidenceCandidateIds: [candidate.id],
    };
  });

  let changed = true;
  while (changed) {
    changed = false;
    const next: ArenaRegionVolume[] = [];
    const consumed = new Set<number>();

    for (let i = 0; i < volumes.length; i += 1) {
      if (consumed.has(i)) continue;
      let current = volumes[i]!;
      consumed.add(i);

      for (let j = i + 1; j < volumes.length; j += 1) {
        if (consumed.has(j)) continue;
        if (!nearOrOverlapping(current, volumes[j]!, mergeGap)) continue;
        current = merge(current, volumes[j]!);
        consumed.add(j);
        changed = true;
      }
      next.push(current);
    }
    volumes = next;
  }

  volumes = volumes
    .filter((volume) => blockCount(volume) <= maxVolumeBlocks)
    .sort(
      (a, b) =>
        a.min.x - b.min.x ||
        a.min.y - b.min.y ||
        a.min.z - b.min.z,
    );

  if (volumes.length === 0) return undefined;

  const boundingBox = volumes.reduce(
    (acc, volume) => ({
      min: minPoint(acc.min, volume.min),
      max: maxPoint(acc.max, volume.max),
    }),
    { min: volumes[0]!.min, max: volumes[0]!.max },
  );

  const totalBlocks = volumes.reduce(
    (sum, volume) => sum + blockCount(volume),
    0,
  );

  const confidence: ArenaRegionPlan["confidence"] =
    discovery.confidence === "high" &&
    supportedCandidates.length >= 5
      ? "high"
      : discovery.confidence !== "low" &&
          supportedCandidates.length >= 3
        ? "medium"
        : "low";

  return {
    volumes,
    boundingBox,
    totalBlocks,
    evidenceCandidates: supportedCandidates.length,
    mergeGapBlocks: mergeGap,
    confidence,
  };
}
