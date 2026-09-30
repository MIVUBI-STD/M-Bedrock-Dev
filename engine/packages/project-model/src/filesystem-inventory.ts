import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { FileInventoryEntry } from "./project.js";

async function hashFile(path: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export async function buildFilesystemInventory(root: string): Promise<FileInventoryEntry[]> {
  const output: FileInventoryEntry[] = [];

  async function walk(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const info = await stat(full);
        output.push({
          relativePath: relative(root, full).replaceAll("\\", "/"),
          size: info.size,
          contentHash: await hashFile(full),
        });
      }
    }
  }

  await walk(root);
  return output.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
