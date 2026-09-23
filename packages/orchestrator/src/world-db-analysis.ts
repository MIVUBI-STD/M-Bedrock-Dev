import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createLevelDbSnapshot } from "../../../adapters/leveldb/src/snapshot.js";
import { openBedrockLevelDbSnapshot } from "../../../adapters/leveldb/src/native-reader.js";
import { scanLevelDbMetadata } from "../../../adapters/leveldb/src/inspect.js";

const INSPECTION_LEVELDB_BUDGET = {
  maxEntries: 50_000,
  maxValueBytes: 8 * 1024 * 1024,
  maxTotalValueBytes: 256 * 1024 * 1024,
};

export interface WorldDbNativeSummary {
  status: "not-present" | "scanned" | "failed";
  entriesScanned: number;
  truncated: boolean;
  actorRecords: number;
  actorDigestRecords: number;
  chunkRecords: number;
  blockEntityRecords: number;
  pendingTickRecords: number;
  randomTickRecords: number;
  finalizedStateRecords: number;
  subChunkRecords: number;
  dimensions: number[];
  chunksObserved: number;
  chunkSignals: Array<{
    chunkX: number;
    chunkZ: number;
    dimensionId: number;
    kinds: string[];
  }>;
  chunkSignalsTruncated: boolean;
  failure?: string;
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

export async function analyzeWorldDbNative(
  worldRoot: string,
): Promise<WorldDbNativeSummary> {
  const dbRoot = join(worldRoot, "db");
  if (!(await isDirectory(dbRoot))) {
    return {
      status: "not-present",
      entriesScanned: 0,
      truncated: false,
      actorRecords: 0,
      actorDigestRecords: 0,
      chunkRecords: 0,
      blockEntityRecords: 0,
      pendingTickRecords: 0,
      randomTickRecords: 0,
      finalizedStateRecords: 0,
      subChunkRecords: 0,
      dimensions: [],
      chunksObserved: 0,
      chunkSignals: [],
      chunkSignalsTruncated: false,
    };
  }

  const tempRoot = await mkdtemp(join(tmpdir(), "m-bedrock-leveldb-"));
  const snapshotRoot = join(tempRoot, "db");

  try {
    await createLevelDbSnapshot(dbRoot, snapshotRoot);
    const reader = await openBedrockLevelDbSnapshot(snapshotRoot);

    try {
      const scan = await scanLevelDbMetadata(reader, INSPECTION_LEVELDB_BUDGET);
      const dimensions = new Set<number>();
      const chunks = new Set<string>();
      const chunkKinds = new Map<string, Set<string>>();

      for (const entry of scan.metadata) {
        if (entry.dimensionId !== undefined) dimensions.add(entry.dimensionId);
        if (
          entry.keyFamily === "chunk-data" &&
          entry.chunkX !== undefined &&
          entry.chunkZ !== undefined
        ) {
          const dimensionId = entry.dimensionId ?? 0;
          const chunkKey = `${dimensionId}:${entry.chunkX}:${entry.chunkZ}`;
          chunks.add(chunkKey);
          const kinds = chunkKinds.get(chunkKey) ?? new Set<string>();
          if (entry.chunkDataKind) kinds.add(entry.chunkDataKind);
          chunkKinds.set(chunkKey, kinds);
        }
      }

      const chunkSignals = [...chunkKinds.entries()]
        .slice(0, 1024)
        .map(([key, kinds]) => {
          const [dimensionText, xText, zText] = key.split(":");
          return {
            dimensionId: Number(dimensionText),
            chunkX: Number(xText),
            chunkZ: Number(zText),
            kinds: [...kinds].sort(),
          };
        });

      return {
        status: "scanned",
        entriesScanned: scan.entriesScanned,
        truncated: scan.truncated,
        actorRecords: scan.keyFamilies.actor ?? 0,
        actorDigestRecords: scan.keyFamilies["actor-digest"] ?? 0,
        chunkRecords: scan.keyFamilies["chunk-data"] ?? 0,
        blockEntityRecords: scan.chunkDataKinds.BlockEntity ?? 0,
        pendingTickRecords: scan.chunkDataKinds.PendingTicks ?? 0,
        randomTickRecords: scan.chunkDataKinds.RandomTicks ?? 0,
        finalizedStateRecords: scan.chunkDataKinds.FinalizedState ?? 0,
        subChunkRecords: scan.chunkDataKinds.SubChunkPrefix ?? 0,
        dimensions: [...dimensions].sort((a, b) => a - b),
        chunksObserved: chunks.size,
        chunkSignals,
        chunkSignalsTruncated: chunkKinds.size > chunkSignals.length,
      };
    } finally {
      await reader.close();
    }
  } catch (error) {
    return {
      status: "failed",
      entriesScanned: 0,
      truncated: false,
      actorRecords: 0,
      actorDigestRecords: 0,
      chunkRecords: 0,
      blockEntityRecords: 0,
      pendingTickRecords: 0,
      randomTickRecords: 0,
      finalizedStateRecords: 0,
      subChunkRecords: 0,
      dimensions: [],
      chunksObserved: 0,
      chunkSignals: [],
      chunkSignalsTruncated: false,
      failure: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
