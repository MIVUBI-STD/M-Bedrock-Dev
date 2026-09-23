import { lstat, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export interface MutationWorkspace {
  sourceRoot: string;
  workingRoot: string;
}

export interface PreparedMutationWorkspace extends MutationWorkspace {
  sourceRootReal: string;
  workingRootReal: string;
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel) && !rel.startsWith(sep));
}

function overlaps(a: string, b: string): boolean {
  return isWithin(a, b) || isWithin(b, a);
}

async function assertDirectory(path: string, label: string): Promise<void> {
  const info = await stat(path);
  if (!info.isDirectory()) {
    throw new Error(`${label} must be a directory.`);
  }
}

export async function prepareMutationWorkspace(
  workspace: MutationWorkspace,
): Promise<PreparedMutationWorkspace> {
  await assertDirectory(workspace.sourceRoot, "sourceRoot");
  await assertDirectory(workspace.workingRoot, "workingRoot");

  const [sourceRootReal, workingRootReal] = await Promise.all([
    realpath(workspace.sourceRoot),
    realpath(workspace.workingRoot),
  ]);

  if (overlaps(sourceRootReal, workingRootReal)) {
    throw new Error("Mutation source and working roots must not overlap.");
  }

  return {
    ...workspace,
    sourceRootReal,
    workingRootReal,
  };
}

async function existingRealPathOrParent(
  absolutePath: string,
): Promise<{ realTarget: string; exists: boolean }> {
  try {
    return {
      realTarget: await realpath(absolutePath),
      exists: true,
    };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : undefined;
    if (code !== "ENOENT") throw error;

    const parent = dirname(absolutePath);
    const parentReal = await realpath(parent);
    return {
      realTarget: join(parentReal, absolutePath.slice(parent.length + 1)),
      exists: false,
    };
  }
}

async function assertNotHardlinkedToSource(
  workspace: PreparedMutationWorkspace,
  relativePath: string,
  targetPath: string,
): Promise<void> {
  const sourceCandidate = resolve(workspace.sourceRootReal, relativePath);

  try {
    const [sourceInfo, targetInfo] = await Promise.all([
      stat(sourceCandidate),
      stat(targetPath),
    ]);

    if (
      sourceInfo.dev === targetInfo.dev &&
      sourceInfo.ino !== 0n &&
      sourceInfo.ino === targetInfo.ino
    ) {
      throw new Error("Mutation target is hardlinked to immutable source content.");
    }
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : undefined;
    if (code === "ENOENT") return;
    throw error;
  }
}

export async function resolveWorkingPathSecure(
  workspace: PreparedMutationWorkspace,
  relativePath: string,
): Promise<string> {
  if (!relativePath || isAbsolute(relativePath)) {
    throw new Error("Mutation target must be a non-empty relative path.");
  }

  const lexicalTarget = resolve(workspace.workingRootReal, relativePath);
  if (!isWithin(workspace.workingRootReal, lexicalTarget)) {
    throw new Error("Mutation target escapes working root.");
  }

  const { realTarget, exists } = await existingRealPathOrParent(lexicalTarget);

  if (!isWithin(workspace.workingRootReal, realTarget)) {
    throw new Error("Mutation target escapes working root through filesystem links.");
  }
  if (isWithin(workspace.sourceRootReal, realTarget)) {
    throw new Error("Mutation target resolves into immutable source root.");
  }

  if (exists) {
    const linkInfo = await lstat(lexicalTarget);
    if (linkInfo.isSymbolicLink()) {
      throw new Error("Mutation target must not be a symbolic link.");
    }
    if (!linkInfo.isFile()) {
      throw new Error("Mutation target must be a regular file.");
    }

    await assertNotHardlinkedToSource(workspace, relativePath, lexicalTarget);
  }

  return lexicalTarget;
}

/**
 * Lexical-only compatibility helper.
 * Mutation application must use prepareMutationWorkspace + resolveWorkingPathSecure.
 */
export function resolveWorkingPath(
  workspace: MutationWorkspace,
  relativePath: string,
): string {
  const target = resolve(workspace.workingRoot, relativePath);
  if (!isWithin(resolve(workspace.workingRoot), target)) {
    throw new Error("Mutation target escapes working root.");
  }
  return target;
}
