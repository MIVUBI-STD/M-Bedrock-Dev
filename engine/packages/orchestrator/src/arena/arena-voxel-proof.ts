import { createHash } from "node:crypto";
import {
  blockAt,
  decodeBedrockSubChunk,
  type BedrockLevelDbReader,
  type DecodedBedrockBlockState,
  UnsupportedSubChunkFormatError,
} from "../../../../adapters/leveldb/src/index.js";
import type {
  ArenaRegionPlan,
  ArenaSpatialLayoutSource,
  ArenaVector3,
  Translation3,
} from "../../../../analyzers/topology/src/index.js";

export type ArenaVoxelProofStatus =
  | "verified"
  | "diverged"
  | "incomplete"
  | "budget-exceeded";

export interface ArenaVoxelMismatch {
  canonical: ArenaVector3;
  replica: ArenaVector3;
  canonicalSignature: string;
  replicaSignature: string;
}

export interface ArenaVoxelReplicaProof {
  arenaId: string;
  status: ArenaVoxelProofStatus;
  comparedBlocks: number;
  unresolvedBlocks: number;
  mismatches: readonly ArenaVoxelMismatch[];
  mismatchCount: number;
}

export interface ArenaVoxelProof {
  status: ArenaVoxelProofStatus;
  sampledBlocks: number;
  requiredBlocks: number;
  region: {
    min: ArenaVector3;
    max: ArenaVector3;
  };
  regions: readonly {
    min: ArenaVector3;
    max: ArenaVector3;
  }[];
  regionSource: "topology-plan" | "fallback-envelope";
  replicas: readonly ArenaVoxelReplicaProof[];
}

export interface ArenaVoxelProofOptions {
  marginBlocks?: number;
  dimensionId?: number;
  maxBlocks?: number;
  maxMismatchesPerReplica?: number;
  regionPlan?: ArenaRegionPlan;
  includedVolumes?: readonly {
    min: ArenaVector3;
    max: ArenaVector3;
  }[];
}

function floorDiv(value: number, divisor: number): number {
  return Math.floor(value / divisor);
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function subChunkKey(
  chunkX: number,
  chunkZ: number,
  subChunkY: number,
  dimensionId: number,
): Uint8Array {
  const bytes = new Uint8Array(dimensionId === 0 ? 10 : 14);
  const view = new DataView(bytes.buffer);
  view.setInt32(0, chunkX, true);
  view.setInt32(4, chunkZ, true);
  let offset = 8;
  if (dimensionId !== 0) {
    view.setInt32(offset, dimensionId, true);
    offset += 4;
  }
  bytes[offset] = 47;
  view.setInt8(offset + 1, subChunkY);
  return bytes;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
}

function blockSignature(
  layers: readonly (DecodedBedrockBlockState | undefined)[],
): string {
  return createHash("sha256")
    .update(JSON.stringify(
      layers.map((block) =>
        block === undefined
          ? null
          : { name: block.name, states: stable(block.states) }
      ),
    ))
    .digest("hex")
    .slice(0, 24);
}

function envelope(
  discovery: ArenaSpatialLayoutSource,
  marginBlocks: number,
) {
  const points = [
    discovery.canonical.anchor,
    ...("items" in discovery.canonical
      ? discovery.canonical.items
          .map((item) => item.position)
          .filter((item): item is ArenaVector3 => item !== undefined)
      : []),
  ];
  return {
    min: {
      x: Math.floor(Math.min(...points.map((item) => item.x))) - marginBlocks,
      y: Math.floor(Math.min(...points.map((item) => item.y))) - marginBlocks,
      z: Math.floor(Math.min(...points.map((item) => item.z))) - marginBlocks,
    },
    max: {
      x: Math.ceil(Math.max(...points.map((item) => item.x))) + marginBlocks,
      y: Math.ceil(Math.max(...points.map((item) => item.y))) + marginBlocks,
      z: Math.ceil(Math.max(...points.map((item) => item.z))) + marginBlocks,
    },
  };
}

interface CachedSubChunk {
  status: "present" | "missing" | "unsupported" | "invalid";
  decoded?: Awaited<ReturnType<typeof decodeBedrockSubChunk>>;
}

function translated(
  point: ArenaVector3,
  offset: Translation3,
): ArenaVector3 {
  return {
    x: point.x + offset.x,
    y: point.y + offset.y,
    z: point.z + offset.z,
  };
}

export async function proveArenaVoxelEquivalence(
  reader: BedrockLevelDbReader,
  discovery: ArenaSpatialLayoutSource,
  options: ArenaVoxelProofOptions = {},
): Promise<ArenaVoxelProof> {
  const fallbackRegion = envelope(discovery, options.marginBlocks ?? 16);
  const regions =
    options.includedVolumes ??
    options.regionPlan?.volumes.map((volume) => ({
      min: volume.min,
      max: volume.max,
    })) ??
    [fallbackRegion];
  const region =
    options.regionPlan?.boundingBox ?? fallbackRegion;
  const regionSource =
    options.regionPlan === undefined &&
    options.includedVolumes === undefined
      ? "fallback-envelope" as const
      : "topology-plan" as const;
  const maxBlocks = options.maxBlocks ?? 250_000;
  const maxMismatches = options.maxMismatchesPerReplica ?? 128;
  const dimensionId = options.dimensionId ?? 0;
  const requiredBlocks = regions.reduce(
    (sum, volume) =>
      sum +
      (volume.max.x - volume.min.x + 1) *
      (volume.max.y - volume.min.y + 1) *
      (volume.max.z - volume.min.z + 1),
    0,
  );

  if (requiredBlocks > maxBlocks) {
    return {
      status: "budget-exceeded",
      sampledBlocks: 0,
      requiredBlocks,
      region,
      regions,
      regionSource,
      replicas: discovery.replicas.map((replica) => ({
        arenaId: replica.arenaId,
        status: "budget-exceeded",
        comparedBlocks: 0,
        unresolvedBlocks: requiredBlocks,
        mismatches: [],
        mismatchCount: 0,
      })),
    };
  }

  const cache = new Map<string, Promise<CachedSubChunk>>();
  const load = (
    chunkX: number,
    chunkZ: number,
    subChunkY: number,
  ): Promise<CachedSubChunk> => {
    const key = `${dimensionId}:${chunkX}:${chunkZ}:${subChunkY}`;
    const existing = cache.get(key);
    if (existing) return existing;

    const promise = (async (): Promise<CachedSubChunk> => {
      const bytes = await reader.get(
        subChunkKey(chunkX, chunkZ, subChunkY, dimensionId),
      );
      if (!bytes) return { status: "missing" };
      try {
        return {
          status: "present",
          decoded: await decodeBedrockSubChunk(bytes),
        };
      } catch (error) {
        if (error instanceof UnsupportedSubChunkFormatError) {
          return { status: "unsupported" };
        }
        return { status: "invalid" };
      }
    })();
    cache.set(key, promise);
    return promise;
  };

  const signatureAt = async (
    point: ArenaVector3,
  ): Promise<string | undefined> => {
    const chunkX = floorDiv(point.x, 16);
    const chunkZ = floorDiv(point.z, 16);
    const subChunkY = floorDiv(point.y, 16);
    const loaded = await load(chunkX, chunkZ, subChunkY);
    if (loaded.status !== "present" || !loaded.decoded) return undefined;

    const localX = mod(point.x, 16);
    const localY = mod(point.y, 16);
    const localZ = mod(point.z, 16);
    return blockSignature(
      loaded.decoded.layers.map((_, layer) =>
        blockAt(loaded.decoded!, localX, localY, localZ, layer)
      ),
    );
  };

  const replicaState = discovery.replicas.map((replica) => ({
    arenaId: replica.arenaId,
    comparedBlocks: 0,
    unresolvedBlocks: 0,
    mismatches: [] as ArenaVoxelMismatch[],
    mismatchCount: 0,
  }));

  let sampledBlocks = 0;
  for (const volume of regions) {
    for (let x = volume.min.x; x <= volume.max.x; x += 1) {
      for (let y = volume.min.y; y <= volume.max.y; y += 1) {
        for (let z = volume.min.z; z <= volume.max.z; z += 1) {
          const canonical = { x, y, z };
          const canonicalSignature = await signatureAt(canonical);
          sampledBlocks += 1;

          for (let index = 0; index < discovery.replicas.length; index += 1) {
            const state = replicaState[index]!;
            const offset = discovery.offsets[index];
            if (!offset || canonicalSignature === undefined) {
              state.unresolvedBlocks += 1;
              continue;
            }

            const replica = translated(canonical, offset);
            const replicaSignature = await signatureAt(replica);
            if (replicaSignature === undefined) {
              state.unresolvedBlocks += 1;
              continue;
            }

            state.comparedBlocks += 1;
            if (canonicalSignature !== replicaSignature) {
              state.mismatchCount += 1;
              if (state.mismatches.length < maxMismatches) {
                state.mismatches.push({
                  canonical,
                  replica,
                  canonicalSignature,
                  replicaSignature,
                });
              }
            }
          }
        }
      }
    }
  }

  const replicas: ArenaVoxelReplicaProof[] = replicaState.map((state) => ({
    ...state,
    status:
      state.mismatchCount > 0
        ? "diverged"
        : state.unresolvedBlocks > 0
          ? "incomplete"
          : "verified",
  }));

  const status: ArenaVoxelProofStatus =
    replicas.some((item) => item.status === "diverged")
      ? "diverged"
      : replicas.some((item) => item.status === "incomplete")
        ? "incomplete"
        : "verified";

  return {
    status,
    sampledBlocks,
    requiredBlocks,
    region,
    regions,
    regionSource,
    replicas,
  };
}


export type ArenaBarrierContainmentStatus =
  | "contained"
  | "escape-reachable"
  | "incomplete"
  | "budget-exceeded";

export interface ArenaBarrierContainmentProof {
  status: ArenaBarrierContainmentStatus;
  visitedPositions: number;
  unresolvedPositions: number;
  blockingBlockNames: readonly string[];
  searchVolume: {
    min: ArenaVector3;
    max: ArenaVector3;
  };
  starts: readonly ArenaVector3[];
  escapePosition?: ArenaVector3;
  statement: string;
}

export interface ArenaBarrierContainmentOptions {
  searchVolume: {
    min: ArenaVector3;
    max: ArenaVector3;
  };
  starts: readonly ArenaVector3[];
  dimensionId?: number;
  maxVisitedPositions?: number;
  /**
   * Deliberately defaults only to minecraft:barrier. Treating every other block
   * as passable makes a CONTAINED result conservative: the barrier enclosure
   * alone must block the player-sized traversal.
   */
  blockingBlockNames?: readonly string[];
}

function pointKey(point: ArenaVector3): string {
  return `${point.x},${point.y},${point.z}`;
}

function inVolume(
  point: ArenaVector3,
  volume: ArenaBarrierContainmentOptions["searchVolume"],
): boolean {
  return (
    point.x >= volume.min.x &&
    point.x <= volume.max.x &&
    point.y >= volume.min.y &&
    point.y <= volume.max.y &&
    point.z >= volume.min.z &&
    point.z <= volume.max.z
  );
}

function onVolumeBoundary(
  point: ArenaVector3,
  volume: ArenaBarrierContainmentOptions["searchVolume"],
): boolean {
  return (
    point.x === volume.min.x ||
    point.x === volume.max.x ||
    point.y === volume.min.y ||
    point.y === volume.max.y ||
    point.z === volume.min.z ||
    point.z === volume.max.z
  );
}

/**
 * Proves whether minecraft:barrier (or an explicitly supplied blocker set)
 * alone encloses a player-sized 1x2 traversal volume around an arena.
 *
 * This is intentionally separate from replica-equivalence proof. Loading or
 * topology envelopes are not physical collision bounds, so leaving those
 * envelopes must never be promoted to an escape finding without this or an
 * equivalent containment proof.
 *
 * All non-listed blocks are treated as passable. Therefore:
 * - "contained" is strong blocking proof;
 * - "escape-reachable" means the supplied blocker set does not prove
 *   containment (other solid geometry may still block escape);
 * - "incomplete" fails closed when world DB evidence is unavailable.
 */
export async function proveArenaBarrierContainment(
  reader: BedrockLevelDbReader,
  options: ArenaBarrierContainmentOptions,
): Promise<ArenaBarrierContainmentProof> {
  const dimensionId = options.dimensionId ?? 0;
  const maxVisitedPositions = options.maxVisitedPositions ?? 250_000;
  const blockingBlockNames = [
    ...new Set(options.blockingBlockNames ?? ["minecraft:barrier"]),
  ].sort();
  const blockers = new Set(blockingBlockNames);
  const cache = new Map<string, Promise<CachedSubChunk>>();

  const load = (
    chunkX: number,
    chunkZ: number,
    subChunkY: number,
  ): Promise<CachedSubChunk> => {
    const key = `${dimensionId}:${chunkX}:${chunkZ}:${subChunkY}`;
    const existing = cache.get(key);
    if (existing) return existing;
    const promise = (async (): Promise<CachedSubChunk> => {
      const bytes = await reader.get(
        subChunkKey(chunkX, chunkZ, subChunkY, dimensionId),
      );
      if (!bytes) return { status: "missing" };
      try {
        return {
          status: "present",
          decoded: await decodeBedrockSubChunk(bytes),
        };
      } catch (error) {
        if (error instanceof UnsupportedSubChunkFormatError) {
          return { status: "unsupported" };
        }
        return { status: "invalid" };
      }
    })();
    cache.set(key, promise);
    return promise;
  };

  const blockNameAt = async (
    point: ArenaVector3,
  ): Promise<string | undefined> => {
    const loaded = await load(
      floorDiv(point.x, 16),
      floorDiv(point.z, 16),
      floorDiv(point.y, 16),
    );
    if (loaded.status !== "present" || !loaded.decoded) {
      return undefined;
    }
    return blockAt(
      loaded.decoded,
      mod(point.x, 16),
      mod(point.y, 16),
      mod(point.z, 16),
      0,
    )?.name;
  };

  let unresolvedPositions = 0;
  const canOccupy = async (
    feet: ArenaVector3,
  ): Promise<boolean | undefined> => {
    const head = { x: feet.x, y: feet.y + 1, z: feet.z };
    if (!inVolume(feet, options.searchVolume) ||
        !inVolume(head, options.searchVolume)) {
      return false;
    }
    const [feetName, headName] = await Promise.all([
      blockNameAt(feet),
      blockNameAt(head),
    ]);
    if (feetName === undefined || headName === undefined) {
      unresolvedPositions += 1;
      return undefined;
    }
    return !blockers.has(feetName) && !blockers.has(headName);
  };

  const queue: ArenaVector3[] = [];
  const visited = new Set<string>();

  for (const start of options.starts) {
    if (!inVolume(start, options.searchVolume)) {
      return {
        status: "incomplete",
        visitedPositions: 0,
        unresolvedPositions: 0,
        blockingBlockNames,
        searchVolume: options.searchVolume,
        starts: options.starts,
        statement:
          "Containment proof is incomplete because a traversal start lies outside the supplied physical search volume.",
      };
    }
    const occupiable = await canOccupy(start);
    if (occupiable === undefined) {
      return {
        status: "incomplete",
        visitedPositions: 0,
        unresolvedPositions,
        blockingBlockNames,
        searchVolume: options.searchVolume,
        starts: options.starts,
        statement:
          "Containment proof is incomplete because start-volume block evidence is unavailable.",
      };
    }
    if (!occupiable) continue;
    const key = pointKey(start);
    if (!visited.has(key)) {
      visited.add(key);
      queue.push(start);
    }
  }

  if (queue.length === 0) {
    return {
      status: "incomplete",
      visitedPositions: 0,
      unresolvedPositions,
      blockingBlockNames,
      searchVolume: options.searchVolume,
      starts: options.starts,
      statement:
        "Containment proof is incomplete because no supplied player start has a valid 1x2 traversable volume.",
    };
  }

  const deltas: readonly ArenaVector3[] = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
  ];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    if (visited.size > maxVisitedPositions) {
      return {
        status: "budget-exceeded",
        visitedPositions: visited.size,
        unresolvedPositions,
        blockingBlockNames,
        searchVolume: options.searchVolume,
        starts: options.starts,
        statement:
          "Containment proof exceeded its bounded traversal budget before closure.",
      };
    }

    const current = queue[cursor]!;
    if (onVolumeBoundary(current, options.searchVolume)) {
      return {
        status: "escape-reachable",
        visitedPositions: visited.size,
        unresolvedPositions,
        blockingBlockNames,
        searchVolume: options.searchVolume,
        starts: options.starts,
        escapePosition: current,
        statement:
          "The supplied blocker set does not enclose the player-sized traversal before the search-volume boundary. This is not by itself proof that other solid geometry permits escape.",
      };
    }

    for (const delta of deltas) {
      const next = {
        x: current.x + delta.x,
        y: current.y + delta.y,
        z: current.z + delta.z,
      };
      if (!inVolume(next, options.searchVolume)) continue;
      const key = pointKey(next);
      if (visited.has(key)) continue;
      const occupiable = await canOccupy(next);
      if (occupiable === undefined) {
        return {
          status: "incomplete",
          visitedPositions: visited.size,
          unresolvedPositions,
          blockingBlockNames,
          searchVolume: options.searchVolume,
          starts: options.starts,
          statement:
            "Containment proof is incomplete because required world DB block evidence is unavailable.",
        };
      }
      if (!occupiable) continue;
      visited.add(key);
      queue.push(next);
    }
  }

  return {
    status: "contained",
    visitedPositions: visited.size,
    unresolvedPositions,
    blockingBlockNames,
    searchVolume: options.searchVolume,
    starts: options.starts,
    statement:
      "The supplied blocking block set encloses every reachable player-sized 1x2 traversal from the supplied starts. Because all other blocks were treated as passable, this is conservative physical blocking proof.",
  };
}
