import { randomUUID } from "node:crypto";
import { chmod, open, rename, stat, unlink } from "node:fs/promises";
import { dirname, basename, join } from "node:path";

const MAX_TEMP_ATTEMPTS = 8;

async function existingMode(path: string): Promise<number | undefined> {
  try {
    return (await stat(path)).mode & 0o777;
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : undefined;
    if (code === "ENOENT") return undefined;
    throw error;
  }
}

export async function atomicWriteText(path: string, content: string): Promise<void> {
  const directory = dirname(path);
  const filename = basename(path);
  const mode = await existingMode(path);

  let tempPath: string | undefined;
  let handle: Awaited<ReturnType<typeof open>> | undefined;

  for (let attempt = 0; attempt < MAX_TEMP_ATTEMPTS; attempt += 1) {
    const candidate = join(
      directory,
      `.${filename}.m-bedrock-dev.${process.pid}.${randomUUID()}.tmp`,
    );
    try {
      handle = await open(candidate, "wx");
      tempPath = candidate;
      break;
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : undefined;
      if (code !== "EEXIST") throw error;
    }
  }

  if (!handle || !tempPath) {
    throw new Error("Unable to allocate collision-safe atomic-write temp file.");
  }

  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;

    if (mode !== undefined) {
      await chmod(tempPath, mode);
    }

    await rename(tempPath, path);
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined);
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}
