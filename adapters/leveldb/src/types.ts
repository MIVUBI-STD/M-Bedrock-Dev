export interface LevelDbEntry {
  key: Uint8Array;
  value: Uint8Array;
}

export interface LevelDbEntryMetadata {
  keyBytes: number;
  valueBytes: number;
  keyHex: string;
  keyPreview?: string;
  keyFamily?: "actor" | "actor-digest" | "chunk-data" | "unknown";
  chunkDataKind?: string;
  chunkX?: number;
  chunkZ?: number;
  dimensionId?: number;
  subChunkIndex?: number;
}

export interface LevelDbScanBudget {
  maxEntries: number;
  maxValueBytes: number;
  maxTotalValueBytes: number;
}

export interface LevelDbScanResult {
  entriesScanned: number;
  totalValueBytes: number;
  truncated: boolean;
  metadata: LevelDbEntryMetadata[];
  keyFamilies: Record<string, number>;
  chunkDataKinds: Record<string, number>;
}

export interface LevelDbSnapshot {
  sourceDbRoot: string;
  workingDbRoot: string;
}

export interface BedrockLevelDbReader {
  get(key: Uint8Array): Promise<Uint8Array | undefined>;
  entries(): AsyncIterable<LevelDbEntry>;
  close(): Promise<void>;
}
