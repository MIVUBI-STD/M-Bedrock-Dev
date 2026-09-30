export interface EmbeddedCommandPlacement {
  target: string;
  flatIndex: number;
  worldX: number;
  worldY: number;
  worldZ: number;
  chunkX: number;
  chunkZ: number;
  command: string;
  confidence: "inferred-transform";
}

export interface NativeChunkSignalInput {
  chunkX: number;
  chunkZ: number;
  dimensionId: number;
  kinds: string[];
}

export function correlateEmbeddedCommandsWithNativeChunks(
  placements: readonly EmbeddedCommandPlacement[],
  chunks: readonly NativeChunkSignalInput[],
) {
  return placements.map((placement) => ({
    ...placement,
    matches: chunks
      .filter((chunk) =>
        chunk.chunkX === placement.chunkX &&
        chunk.chunkZ === placement.chunkZ
      )
      .map((chunk) => ({
        dimensionId: chunk.dimensionId,
        kinds: [...chunk.kinds].sort(),
        hasBlockEntityEvidence: chunk.kinds.includes("BlockEntity"),
        hasPendingTickEvidence: chunk.kinds.includes("PendingTicks"),
        hasRandomTickEvidence: chunk.kinds.includes("RandomTicks"),
      }))
      .sort((a, b) => a.dimensionId - b.dimensionId),
  }));
}
