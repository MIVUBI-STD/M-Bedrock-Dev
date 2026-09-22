export interface ExtractionBudget {
  maxFiles: number;
  maxExpandedBytes: number;
  maxSingleFileBytes: number;
  maxCompressionRatio: number;
  maxPathDepth: number;
}

export interface ArchiveEntryDescriptor {
  path: string;
  compressedBytes: number;
  expandedBytes: number;
  isDirectory: boolean;
}

export interface ArchiveInventory {
  entries: ArchiveEntryDescriptor[];
  fileCount: number;
  expandedBytes: number;
}
