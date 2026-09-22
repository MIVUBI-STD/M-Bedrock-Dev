export interface LevelDbEntry {
  key: Uint8Array;
  value: Uint8Array;
}

export interface LevelDbEntryMetadata {
  keyBytes: number;
  valueBytes: number;
  keyHex: string;
  keyPreview?: string;
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
