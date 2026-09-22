import { createHash } from "node:crypto";
import type {
  BedrockLevelDbReader,
  LevelDbEntryMetadata,
  LevelDbScanBudget,
  LevelDbScanResult,
} from "./types.js";

export const DEFAULT_LEVELDB_SCAN_BUDGET: LevelDbScanBudget = {
  maxEntries: 100_000,
  maxValueBytes: 16 * 1024 * 1024,
  maxTotalValueBytes: 512 * 1024 * 1024,
};

function printableAscii(bytes: Uint8Array): string | undefined {
  if (bytes.length === 0 || bytes.length > 96) return undefined;
  for (const byte of bytes) {
    if (byte < 0x20 || byte > 0x7e) return undefined;
  }
  return Buffer.from(bytes).toString("utf8");
}

export function describeLevelDbEntry(
  key: Uint8Array,
  value: Uint8Array,
): LevelDbEntryMetadata {
  const result: LevelDbEntryMetadata = {
    keyBytes: key.byteLength,
    valueBytes: value.byteLength,
    keyHex: Buffer.from(key).toString("hex"),
  };

  const preview = printableAscii(key);
  if (preview) result.keyPreview = preview;

  return result;
}

export async function scanLevelDbMetadata(
  reader: BedrockLevelDbReader,
  budget: LevelDbScanBudget = DEFAULT_LEVELDB_SCAN_BUDGET,
): Promise<LevelDbScanResult> {
  const metadata: LevelDbEntryMetadata[] = [];
  let entriesScanned = 0;
  let totalValueBytes = 0;
  let truncated = false;

  for await (const entry of reader.entries()) {
    if (entriesScanned >= budget.maxEntries) {
      truncated = true;
      break;
    }

    if (entry.value.byteLength > budget.maxValueBytes) {
      truncated = true;
      break;
    }

    if (totalValueBytes + entry.value.byteLength > budget.maxTotalValueBytes) {
      truncated = true;
      break;
    }

    metadata.push(describeLevelDbEntry(entry.key, entry.value));
    entriesScanned += 1;
    totalValueBytes += entry.value.byteLength;
  }

  return {
    entriesScanned,
    totalValueBytes,
    truncated,
    metadata,
  };
}

export function hashLevelDbKey(key: Uint8Array): string {
  return createHash("sha256").update(key).digest("hex");
}
