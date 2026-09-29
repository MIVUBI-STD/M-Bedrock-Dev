import type { ResolvedEffect } from "./effect-resolution.js";
import {
  effectSignature,
  type Translation3,
} from "./signature.js";
import type { TopologyCandidate } from "./candidates.js";
import type {
  ArenaReplicaItem,
  ArenaReplicaSnapshot,
  ArenaVector3,
} from "./arena-replica.js";

export interface ArenaReplicaDiscovery {
  canonical: ArenaReplicaSnapshot;
  replicas: readonly ArenaReplicaSnapshot[];
  offsets: readonly Translation3[];
  supportByOffset: Readonly<Record<string, number>>;
  confidence: "low" | "medium" | "high";
  evidenceCandidates: number;
}

export interface ArenaReplicaDiscoveryOptions {
  minCandidateSupport?: number;
  minSupportRatio?: number;
  canonicalArenaId?: string;
  arenaIdPrefix?: string;
}

function keyOf(offset: Translation3): string {
  return `${offset.x},${offset.y},${offset.z}`;
}

function plus(a: ArenaVector3, b: Translation3): ArenaVector3 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

function confidenceFor(
  replicaCount: number,
  evidenceCandidates: number,
  minimumSupport: number,
): "low" | "medium" | "high" {
  if (
    replicaCount >= 2 &&
    evidenceCandidates >= 5 &&
    minimumSupport >= 4
  ) return "high";
  if (
    replicaCount >= 1 &&
    evidenceCandidates >= 3 &&
    minimumSupport >= 2
  ) return "medium";
  return "low";
}

function itemForEffect(
  key: string,
  effect: ResolvedEffect,
): ArenaReplicaItem {
  const signature = effectSignature(effect);
  return {
    key,
    signature: `${signature.kind}:${signature.shapeHash}`,
    position: signature.anchor,
  };
}

export function discoverArenaReplicasFromTopology(
  effects: readonly ResolvedEffect[],
  candidates: readonly TopologyCandidate[],
  options: ArenaReplicaDiscoveryOptions = {},
): ArenaReplicaDiscovery | undefined {
  const usable = candidates.filter(
    (candidate) =>
      candidate.members.length >= 2 &&
      candidate.baseEffectIndex >= 0 &&
      candidate.baseEffectIndex < effects.length,
  );
  if (usable.length === 0) return undefined;

  const support = new Map<string, {
    offset: Translation3;
    candidateIds: Set<string>;
  }>();

  for (const candidate of usable) {
    for (const member of candidate.members) {
      const offset = member.translationFromBase;
      if (offset.x === 0 && offset.y === 0 && offset.z === 0) continue;
      const key = keyOf(offset);
      const entry = support.get(key) ?? {
        offset,
        candidateIds: new Set<string>(),
      };
      entry.candidateIds.add(candidate.id);
      support.set(key, entry);
    }
  }

  const minSupportRatio = options.minSupportRatio ?? 0.5;
  const derivedMinimum = Math.max(
    2,
    Math.ceil(usable.length * minSupportRatio),
  );
  const minimumSupport =
    options.minCandidateSupport ?? derivedMinimum;

  const supportedOffsets = [...support.values()]
    .filter((entry) => entry.candidateIds.size >= minimumSupport)
    .sort(
      (a, b) =>
        b.candidateIds.size - a.candidateIds.size ||
        a.offset.x - b.offset.x ||
        a.offset.y - b.offset.y ||
        a.offset.z - b.offset.z,
    );

  if (supportedOffsets.length === 0) return undefined;

  const canonicalItems = usable.map((candidate) =>
    itemForEffect(
      `topology:${candidate.id}`,
      effects[candidate.baseEffectIndex]!,
    )
  );

  const canonicalAnchor =
    canonicalItems[0]?.position ?? { x: 0, y: 0, z: 0 };
  const canonical: ArenaReplicaSnapshot = {
    arenaId: options.canonicalArenaId ?? "arena-1",
    anchor: canonicalAnchor,
    items: canonicalItems,
  };

  const prefix = options.arenaIdPrefix ?? "arena";
  const replicas = supportedOffsets.map((entry, index) => {
    const items: ArenaReplicaItem[] = [];

    for (const candidate of usable) {
      const member = candidate.members.find(
        (item) =>
          item.translationFromBase.x === entry.offset.x &&
          item.translationFromBase.y === entry.offset.y &&
          item.translationFromBase.z === entry.offset.z,
      );
      if (!member) continue;

      items.push(
        itemForEffect(
          `topology:${candidate.id}`,
          effects[member.effectIndex]!,
        ),
      );
    }

    return {
      arenaId: `${prefix}-${index + 2}`,
      anchor: plus(canonicalAnchor, entry.offset),
      items,
    };
  });

  const supportByOffset = Object.fromEntries(
    [...support.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => [
        key,
        entry.candidateIds.size,
      ]),
  );

  return {
    canonical,
    replicas,
    offsets: supportedOffsets.map((entry) => entry.offset),
    supportByOffset,
    confidence: confidenceFor(
      replicas.length,
      usable.length,
      minimumSupport,
    ),
    evidenceCandidates: usable.length,
  };
}
