import { createHash } from "node:crypto";
import {
  decodeBedrockBlockEntityRecord,
  type BedrockLevelDbReader,
} from "../../../adapters/leveldb/src/index.js";
import type {
  ArenaSpatialLayoutSource,
  ArenaVector3,
  Translation3,
} from "../../../analyzers/topology/src/index.js";

export type ArenaBlockEntityProofStatus =
  | "verified"
  | "diverged"
  | "incomplete"
  | "budget-exceeded";

export interface ArenaBlockEntityMismatch {
  kind: "missing" | "unexpected" | "payload-mismatch";
  relativePosition: ArenaVector3;
  identifier?: string;
  canonicalSignature?: string;
  replicaSignature?: string;
}

export interface ArenaBlockEntityReplicaProof {
  arenaId: string;
  status: ArenaBlockEntityProofStatus;
  canonicalEntities: number;
  replicaEntities: number;
  comparedEntities: number;
  mismatchCount: number;
  unresolvedChunks: number;
  mismatches: readonly ArenaBlockEntityMismatch[];
}

export interface ArenaBlockEntityProof {
  status: ArenaBlockEntityProofStatus;
  canonicalEntities: number;
  chunksRead: number;
  unresolvedChunks: number;
  replicas: readonly ArenaBlockEntityReplicaProof[];
}

export interface ArenaBlockEntityProofOptions {
  includedVolumes: readonly {
    min: ArenaVector3;
    max: ArenaVector3;
  }[];
  dimensionId?: number;
  maxChunks?: number;
  maxEntitiesPerChunk?: number;
  maxMismatchesPerReplica?: number;
}

function floorDiv(value: number, divisor: number): number {
  return Math.floor(value / divisor);
}

function blockEntityKey(
  chunkX: number,
  chunkZ: number,
  dimensionId: number,
): Uint8Array {
  const bytes = new Uint8Array(dimensionId === 0 ? 9 : 13);
  const view = new DataView(bytes.buffer);
  view.setInt32(0, chunkX, true);
  view.setInt32(4, chunkZ, true);
  let offset = 8;
  if (dimensionId !== 0) {
    view.setInt32(offset, dimensionId, true);
    offset += 4;
  }
  bytes[offset] = 49;
  return bytes;
}

function translatePoint(
  point: ArenaVector3,
  offset: Translation3,
): ArenaVector3 {
  return {
    x: point.x + offset.x,
    y: point.y + offset.y,
    z: point.z + offset.z,
  };
}

function translateVolume(
  volume: { min: ArenaVector3; max: ArenaVector3 },
  offset: Translation3,
) {
  return {
    min: translatePoint(volume.min, offset),
    max: translatePoint(volume.max, offset),
  };
}

function inside(
  point: ArenaVector3,
  volumes: readonly { min: ArenaVector3; max: ArenaVector3 }[],
): boolean {
  return volumes.some((volume) =>
    point.x >= volume.min.x &&
    point.x <= volume.max.x &&
    point.y >= volume.min.y &&
    point.y <= volume.max.y &&
    point.z >= volume.min.z &&
    point.z <= volume.max.z
  );
}

function chunkCoordinates(
  volumes: readonly { min: ArenaVector3; max: ArenaVector3 }[],
): Array<{ x: number; z: number }> {
  const keys = new Set<string>();
  const output: Array<{ x: number; z: number }> = [];

  for (const volume of volumes) {
    const minX = floorDiv(volume.min.x, 16);
    const maxX = floorDiv(volume.max.x, 16);
    const minZ = floorDiv(volume.min.z, 16);
    const maxZ = floorDiv(volume.max.z, 16);
    for (let x = minX; x <= maxX; x += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const key = `${x},${z}`;
        if (keys.has(key)) continue;
        keys.add(key);
        output.push({ x, z });
      }
    }
  }

  return output.sort((a, b) => a.x - b.x || a.z - b.z);
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

function normalizePayload(
  value: unknown,
  anchor: ArenaVector3,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      normalizePayload(item, anchor)
    );
  }
  if (!value || typeof value !== "object") return value;

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(input)) {
    if (key === "x" && typeof item === "number") {
      output[key] = item - anchor.x;
      continue;
    }
    if (key === "y" && typeof item === "number") {
      output[key] = item - anchor.y;
      continue;
    }
    if (key === "z" && typeof item === "number") {
      output[key] = item - anchor.z;
      continue;
    }
    if (key === "pairx" && typeof item === "number") {
      output[key] = item - anchor.x;
      continue;
    }
    if (key === "pairz" && typeof item === "number") {
      output[key] = item - anchor.z;
      continue;
    }
    output[key] = normalizePayload(item, anchor);
  }

  return stable(output);
}

function signature(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex")
    .slice(0, 24);
}

interface NormalizedBlockEntity {
  relativePosition: ArenaVector3;
  identifier?: string;
  signature: string;
}

interface LoadedRegion {
  entities: NormalizedBlockEntity[];
  unresolvedChunks: number;
  chunksRead: number;
}

async function loadRegion(
  reader: BedrockLevelDbReader,
  volumes: readonly { min: ArenaVector3; max: ArenaVector3 }[],
  anchor: ArenaVector3,
  options: Required<Pick<
    ArenaBlockEntityProofOptions,
    "dimensionId" | "maxEntitiesPerChunk"
  >>,
): Promise<LoadedRegion> {
  const chunks = chunkCoordinates(volumes);
  const entities: NormalizedBlockEntity[] = [];
  let unresolvedChunks = 0;
  let chunksRead = 0;

  for (const chunk of chunks) {
    const bytes = await reader.get(
      blockEntityKey(chunk.x, chunk.z, options.dimensionId),
    );
    chunksRead += 1;
    if (!bytes) continue;

    try {
      const decoded = await decodeBedrockBlockEntityRecord(
        bytes,
        { maxEntities: options.maxEntitiesPerChunk },
      );
      for (const entity of decoded.entities) {
        if (!entity.position || !inside(entity.position, volumes)) {
          continue;
        }
        entities.push({
          relativePosition: {
            x: entity.position.x - anchor.x,
            y: entity.position.y - anchor.y,
            z: entity.position.z - anchor.z,
          },
          ...(entity.identifier === undefined
            ? {}
            : { identifier: entity.identifier }),
          signature: signature(
            normalizePayload(entity.value, anchor),
          ),
        });
      }
    } catch {
      unresolvedChunks += 1;
    }
  }

  return {
    entities: entities.sort((a, b) =>
      a.relativePosition.x - b.relativePosition.x ||
      a.relativePosition.y - b.relativePosition.y ||
      a.relativePosition.z - b.relativePosition.z ||
      (a.identifier ?? "").localeCompare(b.identifier ?? "") ||
      a.signature.localeCompare(b.signature)
    ),
    unresolvedChunks,
    chunksRead,
  };
}

function entityKey(
  entity: Pick<NormalizedBlockEntity, "relativePosition" | "identifier">,
): string {
  return [
    entity.relativePosition.x,
    entity.relativePosition.y,
    entity.relativePosition.z,
    entity.identifier ?? "",
  ].join("|");
}

export async function proveArenaBlockEntityEquivalence(
  reader: BedrockLevelDbReader,
  layout: ArenaSpatialLayoutSource,
  options: ArenaBlockEntityProofOptions,
): Promise<ArenaBlockEntityProof> {
  const dimensionId = options.dimensionId ?? 0;
  const maxChunks = options.maxChunks ?? 2048;
  const maxEntitiesPerChunk =
    options.maxEntitiesPerChunk ?? 4096;
  const maxMismatches =
    options.maxMismatchesPerReplica ?? 128;

  const canonicalVolumes = options.includedVolumes;
  const canonicalChunks = chunkCoordinates(canonicalVolumes);
  const replicaChunkTotal = layout.offsets.reduce(
    (sum, offset) =>
      sum +
      chunkCoordinates(
        canonicalVolumes.map((volume) =>
          translateVolume(volume, offset)
        ),
      ).length,
    0,
  );
  const requiredChunks =
    canonicalChunks.length + replicaChunkTotal;

  if (requiredChunks > maxChunks) {
    return {
      status: "budget-exceeded",
      canonicalEntities: 0,
      chunksRead: 0,
      unresolvedChunks: 0,
      replicas: layout.replicas.map((replica) => ({
        arenaId: replica.arenaId,
        status: "budget-exceeded",
        canonicalEntities: 0,
        replicaEntities: 0,
        comparedEntities: 0,
        mismatchCount: 0,
        unresolvedChunks: 0,
        mismatches: [],
      })),
    };
  }

  const canonical = await loadRegion(
    reader,
    canonicalVolumes,
    layout.canonical.anchor,
    { dimensionId, maxEntitiesPerChunk },
  );

  const canonicalByKey = new Map(
    canonical.entities.map((entity) => [
      entityKey(entity),
      entity,
    ]),
  );

  let totalChunksRead = canonical.chunksRead;
  let totalUnresolvedChunks = canonical.unresolvedChunks;

  const replicas: ArenaBlockEntityReplicaProof[] = [];

  for (let index = 0; index < layout.replicas.length; index += 1) {
    const replica = layout.replicas[index]!;
    const offset = layout.offsets[index];
    if (!offset) {
      replicas.push({
        arenaId: replica.arenaId,
        status: "incomplete",
        canonicalEntities: canonical.entities.length,
        replicaEntities: 0,
        comparedEntities: 0,
        mismatchCount: 0,
        unresolvedChunks: 1,
        mismatches: [],
      });
      totalUnresolvedChunks += 1;
      continue;
    }

    const translatedVolumes = canonicalVolumes.map((volume) =>
      translateVolume(volume, offset)
    );
    const loaded = await loadRegion(
      reader,
      translatedVolumes,
      replica.anchor,
      { dimensionId, maxEntitiesPerChunk },
    );
    totalChunksRead += loaded.chunksRead;
    totalUnresolvedChunks += loaded.unresolvedChunks;

    const replicaByKey = new Map(
      loaded.entities.map((entity) => [
        entityKey(entity),
        entity,
      ]),
    );
    const keys = new Set([
      ...canonicalByKey.keys(),
      ...replicaByKey.keys(),
    ]);

    const mismatches: ArenaBlockEntityMismatch[] = [];
    let mismatchCount = 0;
    let comparedEntities = 0;

    for (const key of [...keys].sort()) {
      const expected = canonicalByKey.get(key);
      const actual = replicaByKey.get(key);
      if (!expected && actual) {
        mismatchCount += 1;
        if (mismatches.length < maxMismatches) {
          mismatches.push({
            kind: "unexpected",
            relativePosition: actual.relativePosition,
            ...(actual.identifier === undefined
              ? {}
              : { identifier: actual.identifier }),
            replicaSignature: actual.signature,
          });
        }
        continue;
      }
      if (expected && !actual) {
        mismatchCount += 1;
        if (mismatches.length < maxMismatches) {
          mismatches.push({
            kind: "missing",
            relativePosition: expected.relativePosition,
            ...(expected.identifier === undefined
              ? {}
              : { identifier: expected.identifier }),
            canonicalSignature: expected.signature,
          });
        }
        continue;
      }
      if (!expected || !actual) continue;

      comparedEntities += 1;
      if (expected.signature !== actual.signature) {
        mismatchCount += 1;
        if (mismatches.length < maxMismatches) {
          mismatches.push({
            kind: "payload-mismatch",
            relativePosition: expected.relativePosition,
            ...(expected.identifier === undefined
              ? {}
              : { identifier: expected.identifier }),
            canonicalSignature: expected.signature,
            replicaSignature: actual.signature,
          });
        }
      }
    }

    replicas.push({
      arenaId: replica.arenaId,
      status:
        mismatchCount > 0
          ? "diverged"
          : canonical.unresolvedChunks > 0 ||
              loaded.unresolvedChunks > 0
            ? "incomplete"
            : "verified",
      canonicalEntities: canonical.entities.length,
      replicaEntities: loaded.entities.length,
      comparedEntities,
      mismatchCount,
      unresolvedChunks:
        canonical.unresolvedChunks +
        loaded.unresolvedChunks,
      mismatches,
    });
  }

  return {
    status:
      replicas.some((item) => item.status === "diverged")
        ? "diverged"
        : replicas.some((item) => item.status === "incomplete")
          ? "incomplete"
          : "verified",
    canonicalEntities: canonical.entities.length,
    chunksRead: totalChunksRead,
    unresolvedChunks: totalUnresolvedChunks,
    replicas,
  };
}
