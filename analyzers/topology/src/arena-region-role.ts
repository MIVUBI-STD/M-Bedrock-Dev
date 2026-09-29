import type { ArenaRegionPlan, ArenaRegionVolume } from "./arena-region.js";
import type { TopologyCandidate } from "./candidates.js";
import type { ResolvedEffect } from "./effect-resolution.js";
import { effectSignature } from "./signature.js";

export type ArenaRegionRole =
  | "static"
  | "mutable"
  | "mixed"
  | "unknown";

export interface ArenaRegionRoleEvidence {
  candidateId: string;
  effectIndex: number;
  signature: string;
  sourcePath: string;
}

export interface ClassifiedArenaRegionVolume extends ArenaRegionVolume {
  role: ArenaRegionRole;
  evidence: readonly ArenaRegionRoleEvidence[];
  mutableConflictKeys: readonly string[];
}

export interface ArenaRegionClassification {
  volumes: readonly ClassifiedArenaRegionVolume[];
  staticVolumes: readonly ArenaRegionVolume[];
  mutableVolumes: readonly ArenaRegionVolume[];
  mixedVolumes: readonly ArenaRegionVolume[];
  unknownVolumes: readonly ArenaRegionVolume[];
}

function overlaps(
  a: ArenaRegionVolume,
  b: ArenaRegionVolume,
): boolean {
  return !(
    a.max.x < b.min.x ||
    b.max.x < a.min.x ||
    a.max.y < b.min.y ||
    b.max.y < a.min.y ||
    a.max.z < b.min.z ||
    b.max.z < a.min.z
  );
}

function sameBounds(
  a: ArenaRegionVolume,
  b: ArenaRegionVolume,
): boolean {
  return (
    a.min.x === b.min.x &&
    a.min.y === b.min.y &&
    a.min.z === b.min.z &&
    a.max.x === b.max.x &&
    a.max.y === b.max.y &&
    a.max.z === b.max.z
  );
}

function targetVolume(effect: ResolvedEffect): ArenaRegionVolume {
  if (effect.kind === "fill") {
    return {
      min: {
        x: Math.min(effect.from.x, effect.to.x),
        y: Math.min(effect.from.y, effect.to.y),
        z: Math.min(effect.from.z, effect.to.z),
      },
      max: {
        x: Math.max(effect.from.x, effect.to.x),
        y: Math.max(effect.from.y, effect.to.y),
        z: Math.max(effect.from.z, effect.to.z),
      },
      evidenceCandidateIds: [],
    };
  }

  if (effect.kind === "clone") {
    const size = {
      x: Math.abs(effect.to.x - effect.from.x),
      y: Math.abs(effect.to.y - effect.from.y),
      z: Math.abs(effect.to.z - effect.from.z),
    };
    return {
      min: effect.destination,
      max: {
        x: effect.destination.x + size.x,
        y: effect.destination.y + size.y,
        z: effect.destination.z + size.z,
      },
      evidenceCandidateIds: [],
    };
  }

  const point =
    effect.kind === "setblock" || effect.kind === "entity-spawn"
      ? effect.position
      : effect.destination;
  return {
    min: point,
    max: point,
    evidenceCandidateIds: [],
  };
}

function writeIdentity(effect: ResolvedEffect): string {
  const signature = effectSignature(effect);
  if (effect.kind === "fill") {
    return [
      signature.kind,
      signature.shapeHash,
      effect.block,
    ].join(":");
  }
  if (effect.kind === "setblock") {
    return [
      signature.kind,
      signature.shapeHash,
      effect.block,
    ].join(":");
  }
  if (effect.kind === "clone") {
    return [
      signature.kind,
      signature.shapeHash,
      effect.from.x,
      effect.from.y,
      effect.from.z,
      effect.to.x,
      effect.to.y,
      effect.to.z,
    ].join(":");
  }
  return [
    signature.kind,
    signature.shapeHash,
  ].join(":");
}

export function classifyArenaRegionRoles(
  plan: ArenaRegionPlan,
  effects: readonly ResolvedEffect[],
  candidates: readonly TopologyCandidate[],
): ArenaRegionClassification {
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  );

  const classified = plan.volumes.map((volume): ClassifiedArenaRegionVolume => {
    const evidence: ArenaRegionRoleEvidence[] = [];
    const writes: Array<{
      candidateId: string;
      volume: ArenaRegionVolume;
      identity: string;
      sourcePath: string;
    }> = [];

    for (const candidateId of volume.evidenceCandidateIds) {
      const candidate = candidateById.get(candidateId);
      if (!candidate) continue;
      const effect = effects[candidate.baseEffectIndex];
      if (!effect) continue;

      const signature = effectSignature(effect);
      evidence.push({
        candidateId,
        effectIndex: candidate.baseEffectIndex,
        signature: `${signature.kind}:${signature.shapeHash}`,
        sourcePath: effect.sourcePath,
      });

      if (
        effect.kind === "fill" ||
        effect.kind === "setblock" ||
        effect.kind === "clone"
      ) {
        writes.push({
          candidateId,
          volume: targetVolume(effect),
          identity: writeIdentity(effect),
          sourcePath: effect.sourcePath,
        });
      }
    }

    const conflictKeys = new Set<string>();
    const mutableCandidates = new Set<string>();

    for (let i = 0; i < writes.length; i += 1) {
      for (let j = i + 1; j < writes.length; j += 1) {
        const a = writes[i]!;
        const b = writes[j]!;
        if (!overlaps(a.volume, b.volume)) continue;

        const exactSameTarget = sameBounds(a.volume, b.volume);
        const distinctWrite =
          a.identity !== b.identity ||
          a.sourcePath !== b.sourcePath;

        if (exactSameTarget && distinctWrite) {
          const key = [a.candidateId, b.candidateId].sort().join("|");
          conflictKeys.add(key);
          mutableCandidates.add(a.candidateId);
          mutableCandidates.add(b.candidateId);
        }
      }
    }

    const mutableEvidence = evidence.filter((item) =>
      mutableCandidates.has(item.candidateId)
    );
    const staticEvidence = evidence.filter((item) =>
      !mutableCandidates.has(item.candidateId)
    );

    let role: ArenaRegionRole = "unknown";
    if (mutableEvidence.length > 0 && staticEvidence.length > 0) {
      role = "mixed";
    } else if (mutableEvidence.length > 0) {
      role = "mutable";
    } else if (staticEvidence.length > 0) {
      role = "static";
    }

    return {
      ...volume,
      role,
      evidence,
      mutableConflictKeys: [...conflictKeys].sort(),
    };
  });

  return {
    volumes: classified,
    staticVolumes: classified
      .filter((item) => item.role === "static")
      .map(({ role: _role, evidence: _evidence, mutableConflictKeys: _keys, ...volume }) => volume),
    mutableVolumes: classified
      .filter((item) => item.role === "mutable")
      .map(({ role: _role, evidence: _evidence, mutableConflictKeys: _keys, ...volume }) => volume),
    mixedVolumes: classified
      .filter((item) => item.role === "mixed")
      .map(({ role: _role, evidence: _evidence, mutableConflictKeys: _keys, ...volume }) => volume),
    unknownVolumes: classified
      .filter((item) => item.role === "unknown")
      .map(({ role: _role, evidence: _evidence, mutableConflictKeys: _keys, ...volume }) => volume),
  };
}
