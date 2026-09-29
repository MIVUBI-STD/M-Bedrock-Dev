import { createHash } from "node:crypto";
import {
  blockAt,
  decodeBedrockSubChunk,
  type BedrockLevelDbReader,
  type DecodedBedrockBlockState,
  UnsupportedSubChunkFormatError,
} from "../../../adapters/leveldb/src/index.js";
import type {
  ArenaReplicaDiscovery,
  ArenaVector3,
  Translation3,
} from "../../../analyzers/topology/src/index.js";

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
  replicas: readonly ArenaVoxelReplicaProof[];
}

export interface ArenaVoxelProofOptions {
  marginBlocks?: number;
  dimensionId?: number;
  maxBlocks?: number;
  maxMismatchesPerReplica?: number;
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
  discovery: ArenaReplicaDiscovery,
  marginBlocks: number,
) {
  const points = [
    discovery.canonical.anchor,
    ...discovery.canonical.items
      .map((item) => item.position)
      .filter((item): item is ArenaVector3 => item !== undefined),
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
  discovery: ArenaReplicaDiscovery,
  options: ArenaVoxelProofOptions = {},
): Promise<ArenaVoxelProof> {
  const region = envelope(discovery, options.marginBlocks ?? 16);
  const maxBlocks = options.maxBlocks ?? 250_000;
  const maxMismatches = options.maxMismatchesPerReplica ?? 128;
  const dimensionId = options.dimensionId ?? 0;
  const requiredBlocks =
    (region.max.x - region.min.x + 1) *
    (region.max.y - region.min.y + 1) *
    (region.max.z - region.min.z + 1);

  if (requiredBlocks > maxBlocks) {
    return {
      status: "budget-exceeded",
      sampledBlocks: 0,
      requiredBlocks,
      region,
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
  for (let x = region.min.x; x <= region.max.x; x += 1) {
    for (let y = region.min.y; y <= region.max.y; y += 1) {
      for (let z = region.min.z; z <= region.max.z; z += 1) {
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
    replicas,
  };
}
