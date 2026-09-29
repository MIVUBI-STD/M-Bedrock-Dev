import { createHash } from "node:crypto";

export interface ChunkContentObservation {
  chunkX: number;
  chunkZ: number;
  dimensionId: number;
  kind: string;
  valueHash: string;
  subChunkIndex?: number;
}

export interface ChunkRegion {
  minChunkX: number;
  maxChunkX: number;
  minChunkZ: number;
  maxChunkZ: number;
  dimensionId?: number;
}

export interface RegionalChunkFingerprint {
  algorithm: "sha256";
  hash: string;
  records: number;
  originChunkX: number;
  originChunkZ: number;
  dimensionId?: number;
  components: readonly {
    relativeChunkX: number;
    relativeChunkZ: number;
    kind: string;
    valueHash: string;
    subChunkIndex?: number;
  }[];
}

function digest(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

export function createRegionalChunkFingerprint(
  observations: readonly ChunkContentObservation[],
  region: ChunkRegion,
  origin: { chunkX: number; chunkZ: number },
): RegionalChunkFingerprint {
  const components = observations
    .filter((item) =>
      item.chunkX >= region.minChunkX &&
      item.chunkX <= region.maxChunkX &&
      item.chunkZ >= region.minChunkZ &&
      item.chunkZ <= region.maxChunkZ &&
      (
        region.dimensionId === undefined ||
        item.dimensionId === region.dimensionId
      )
    )
    .map((item) => ({
      relativeChunkX: item.chunkX - origin.chunkX,
      relativeChunkZ: item.chunkZ - origin.chunkZ,
      kind: item.kind,
      valueHash: item.valueHash,
      ...(item.subChunkIndex === undefined
        ? {}
        : { subChunkIndex: item.subChunkIndex }),
    }))
    .sort((a, b) =>
      a.relativeChunkX - b.relativeChunkX ||
      a.relativeChunkZ - b.relativeChunkZ ||
      a.kind.localeCompare(b.kind) ||
      (a.subChunkIndex ?? -129) - (b.subChunkIndex ?? -129) ||
      a.valueHash.localeCompare(b.valueHash)
    );

  return {
    algorithm: "sha256",
    hash: digest(components),
    records: components.length,
    originChunkX: origin.chunkX,
    originChunkZ: origin.chunkZ,
    ...(region.dimensionId === undefined
      ? {}
      : { dimensionId: region.dimensionId }),
    components,
  };
}

export function translatedChunkRegion(
  canonical: ChunkRegion,
  translationBlocks: { x: number; z: number },
): ChunkRegion | undefined {
  if (
    translationBlocks.x % 16 !== 0 ||
    translationBlocks.z % 16 !== 0
  ) {
    return undefined;
  }

  const dx = translationBlocks.x / 16;
  const dz = translationBlocks.z / 16;
  return {
    minChunkX: canonical.minChunkX + dx,
    maxChunkX: canonical.maxChunkX + dx,
    minChunkZ: canonical.minChunkZ + dz,
    maxChunkZ: canonical.maxChunkZ + dz,
    ...(canonical.dimensionId === undefined
      ? {}
      : { dimensionId: canonical.dimensionId }),
  };
}
