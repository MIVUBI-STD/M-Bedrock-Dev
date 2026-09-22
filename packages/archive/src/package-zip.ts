import { openAsBlob, createWriteStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { Writable } from "node:stream";
import { BlobReader, ZipWriter } from "@zip.js/zip.js";

const FIXED_DATE = new Date("2000-01-01T00:00:00.000Z");

async function listFiles(root: string, current = root): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, full));
    else if (entry.isFile()) files.push(full);
  }

  return files;
}

export async function packageDirectoryDeterministically(
  sourceRoot: string,
  outputPath: string,
): Promise<void> {
  const webWritable = Writable.toWeb(createWriteStream(outputPath));
  const writer = new ZipWriter(webWritable as WritableStream<Uint8Array>, {
    keepOrder: true,
  });

  const files = (await listFiles(sourceRoot))
    .sort((a, b) => relative(sourceRoot, a).localeCompare(relative(sourceRoot, b)));

  try {
    for (const file of files) {
      const name = relative(sourceRoot, file).replaceAll("\\", "/");
      const blob = await openAsBlob(file);
      await writer.add(name, new BlobReader(blob), {
        lastModDate: FIXED_DATE,
        creationDate: FIXED_DATE,
        lastAccessDate: FIXED_DATE,
      });
    }
  } finally {
    await writer.close();
  }
}
