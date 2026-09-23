export type BedrockLevelDbKeyFamily =
  | "actor"
  | "actor-digest"
  | "chunk-data"
  | "unknown";

export type BedrockChunkDataKind =
  | "Data3D"
  | "Version"
  | "Data2D"
  | "Data2DLegacy"
  | "SubChunkPrefix"
  | "LegacyTerrain"
  | "BlockEntity"
  | "EntityLegacy"
  | "PendingTicks"
  | "LegacyBlockExtraData"
  | "BiomeState"
  | "FinalizedState"
  | "ConversionData"
  | "BorderBlocks"
  | "HardcodedSpawners"
  | "RandomTicks"
  | "CheckSums"
  | "GenerationSeed"
  | "GeneratedPreCavesAndCliffsBlending"
  | "BlendingBiomeHeight"
  | "MetaDataHash"
  | "BlendingData"
  | "ActorDigestVersion"
  | "LegacyVersion";

const CHUNK_TAGS = new Map<number, BedrockChunkDataKind>([
  [43, "Data3D"],
  [44, "Version"],
  [45, "Data2D"],
  [46, "Data2DLegacy"],
  [47, "SubChunkPrefix"],
  [48, "LegacyTerrain"],
  [49, "BlockEntity"],
  [50, "EntityLegacy"],
  [51, "PendingTicks"],
  [52, "LegacyBlockExtraData"],
  [53, "BiomeState"],
  [54, "FinalizedState"],
  [55, "ConversionData"],
  [56, "BorderBlocks"],
  [57, "HardcodedSpawners"],
  [58, "RandomTicks"],
  [59, "CheckSums"],
  [60, "GenerationSeed"],
  [61, "GeneratedPreCavesAndCliffsBlending"],
  [62, "BlendingBiomeHeight"],
  [63, "MetaDataHash"],
  [64, "BlendingData"],
  [65, "ActorDigestVersion"],
  [118, "LegacyVersion"],
]);

function startsWithAscii(bytes: Uint8Array, prefix: string): boolean {
  const prefixBytes = Buffer.from(prefix, "ascii");
  if (bytes.length < prefixBytes.length) return false;
  for (let index = 0; index < prefixBytes.length; index += 1) {
    if (bytes[index] !== prefixBytes[index]) return false;
  }
  return true;
}

function int32Le(bytes: Uint8Array, offset: number): number | undefined {
  if (bytes.length < offset + 4) return undefined;
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getInt32(offset, true);
}

export interface BedrockLevelDbKeyClassification {
  family: BedrockLevelDbKeyFamily;
  chunkDataKind?: BedrockChunkDataKind;
  chunkX?: number;
  chunkZ?: number;
  dimensionId?: number;
  subChunkIndex?: number;
}

export function classifyBedrockLevelDbKey(
  key: Uint8Array,
): BedrockLevelDbKeyClassification {
  if (startsWithAscii(key, "actorprefix")) {
    return { family: "actor" };
  }
  if (startsWithAscii(key, "digp") || startsWithAscii(key, "dg")) {
    return { family: "actor-digest" };
  }

  const layouts = [
    { prefixBytes: 8, hasDimension: false },
    { prefixBytes: 12, hasDimension: true },
  ] as const;

  for (const layout of layouts) {
    if (key.length !== layout.prefixBytes + 1 && key.length !== layout.prefixBytes + 2) {
      continue;
    }

    const tag = key[layout.prefixBytes];
    const kind = tag === undefined ? undefined : CHUNK_TAGS.get(tag);
    if (!kind) continue;

    const chunkX = int32Le(key, 0);
    const chunkZ = int32Le(key, 4);
    const dimensionId = layout.hasDimension ? int32Le(key, 8) : undefined;
    const subChunkIndex =
      kind === "SubChunkPrefix" && key.length === layout.prefixBytes + 2
        ? new DataView(
            key.buffer,
            key.byteOffset + layout.prefixBytes + 1,
            1,
          ).getInt8(0)
        : undefined;

    return {
      family: "chunk-data",
      chunkDataKind: kind,
      ...(chunkX !== undefined ? { chunkX } : {}),
      ...(chunkZ !== undefined ? { chunkZ } : {}),
      ...(dimensionId !== undefined ? { dimensionId } : {}),
      ...(subChunkIndex !== undefined ? { subChunkIndex } : {}),
    };
  }

  return { family: "unknown" };
}
