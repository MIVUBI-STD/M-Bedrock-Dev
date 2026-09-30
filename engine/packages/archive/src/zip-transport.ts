import { openAsBlob } from "node:fs";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Writable } from "node:stream";
import { BlobReader, ZipReader } from "@zip.js/zip.js";
import { validateArchiveInventory } from "./inventory.js";
import type { ArchiveEntryDescriptor, ExtractionBudget } from "./types.js";
import { validateArchivePath } from "./path-safety.js";

export interface ZipInventoryResult {
  entries: ArchiveEntryDescriptor[];
}

export async function inventoryZip(path: string): Promise<ZipInventoryResult> {
  const blob = await openAsBlob(path);
  const reader = new ZipReader(new BlobReader(blob), {
    checkOverlappingEntry: true,
    strictness: "strict",
  });

  try {
    const entries: ArchiveEntryDescriptor[] = [];
    for await (const entry of reader.getEntriesGenerator()) {
      entries.push({
        path: entry.filename,
        compressedBytes: entry.compressedSize,
        expandedBytes: entry.uncompressedSize,
        isDirectory: entry.directory,
      });
    }
    return { entries };
  } finally {
    await reader.close();
  }
}

export async function extractZipSafely(
  archivePath: string,
  destinationRoot: string,
  budget: ExtractionBudget,
): Promise<ZipInventoryResult> {
  const inventory = await inventoryZip(archivePath);
  const validation = validateArchiveInventory(inventory.entries, budget);
  if (!validation.inventory) {
    throw new Error(
      validation.findings.map((finding) => `${finding.code}: ${finding.message}`).join("\n"),
    );
  }

  const blob = await openAsBlob(archivePath);
  const reader = new ZipReader(new BlobReader(blob), {
    checkOverlappingEntry: true,
    checkCrc32: true,
    strictness: "strict",
  });

  try {
    for await (const entry of reader.getEntriesGenerator()) {
      const checked = validateArchivePath(entry.filename, budget.maxPathDepth);
      if (!checked.ok || !checked.normalized) {
        throw new Error(`Unsafe archive path: ${entry.filename}`);
      }

      const target = resolve(destinationRoot, checked.normalized);
      if (entry.directory) {
        await mkdir(target, { recursive: true });
        continue;
      }

      await mkdir(dirname(target), { recursive: true });
      const stream = createWriteStream(target, { flags: "wx" });
      await entry.getData(Writable.toWeb(stream) as WritableStream<Uint8Array>);
    }
  } finally {
    await reader.close();
  }

  return inventory;
}
