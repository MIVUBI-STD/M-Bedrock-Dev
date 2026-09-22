import type { FileInventoryEntry } from "../../../packages/project-model/src/project.js";

export interface PackCandidate {
  root: string;
  manifestPath: string;
}

export function discoverPackCandidates(files: readonly FileInventoryEntry[]): PackCandidate[] {
  const roots = new Map<string, PackCandidate>();

  for (const file of files) {
    if (!file.relativePath.toLowerCase().endsWith("/manifest.json") && file.relativePath.toLowerCase() !== "manifest.json") {
      continue;
    }

    const slash = file.relativePath.lastIndexOf("/");
    const root = slash >= 0 ? file.relativePath.slice(0, slash) : ".";

    roots.set(root, { root, manifestPath: file.relativePath });
  }

  return [...roots.values()].sort((a, b) => a.root.localeCompare(b.root));
}
