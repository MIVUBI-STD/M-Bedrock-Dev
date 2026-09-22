import { cp, mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { LevelDbSnapshot } from "./types.js";

async function requireDirectory(path: string): Promise<void> {
  const info = await stat(path);
  if (!info.isDirectory()) throw new Error(`Expected LevelDB directory: ${path}`);
}

export async function createLevelDbSnapshot(
  sourceDbRoot: string,
  workingDbRoot: string,
): Promise<LevelDbSnapshot> {
  const source = resolve(sourceDbRoot);
  const working = resolve(workingDbRoot);

  if (source === working) {
    throw new Error("LevelDB source and working snapshot must be different directories.");
  }

  await requireDirectory(source);
  await rm(working, { recursive: true, force: true });
  await mkdir(working, { recursive: true });
  await cp(source, working, {
    recursive: true,
    force: false,
    errorOnExist: true,
    preserveTimestamps: true,
  });

  return {
    sourceDbRoot: source,
    workingDbRoot: working,
  };
}
