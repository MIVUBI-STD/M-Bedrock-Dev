import { relative, resolve, sep } from "node:path";

export interface MutationWorkspace {
  sourceRoot: string;
  workingRoot: string;
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith(sep));
}

export function resolveWorkingPath(
  workspace: MutationWorkspace,
  relativePath: string,
): string {
  const target = resolve(workspace.workingRoot, relativePath);
  if (!isWithin(workspace.workingRoot, target)) {
    throw new Error("Mutation target escapes working root.");
  }
  if (isWithin(workspace.sourceRoot, target)) {
    throw new Error("Mutation target overlaps immutable source root.");
  }
  return target;
}
