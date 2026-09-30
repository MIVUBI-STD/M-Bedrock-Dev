import { posix } from "node:path";
import type { ParsedScriptFile, ScriptImport } from "./types.js";

const EXTENSIONS = [".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"];

function withoutExtension(path: string): string {
  for (const ext of EXTENSIONS) {
    if (path.endsWith(ext)) return path.slice(0, -ext.length);
  }
  return path;
}

function relativeCandidates(fromPath: string, module: string): string[] {
  const base = posix.normalize(posix.join(posix.dirname(fromPath), module));
  const candidates = new Set<string>();

  candidates.add(base);
  for (const ext of EXTENSIONS) candidates.add(base + ext);
  for (const ext of EXTENSIONS) candidates.add(posix.join(base, "index" + ext));

  return [...candidates];
}

export interface ScriptImportResolution {
  fromIdentifier: string;
  module: string;
  status: "resolved" | "unresolved" | "external";
  targetIdentifier?: string;
}

export function resolveScriptImports(
  files: readonly ParsedScriptFile[],
): ScriptImportResolution[] {
  const byPath = new Map<string, ParsedScriptFile>();
  for (const file of files) {
    byPath.set(file.source.relativePath.replaceAll("\\", "/"), file);
  }

  const results: ScriptImportResolution[] = [];

  for (const file of files) {
    for (const imported of file.imports) {
      if (imported.kind !== "relative") {
        results.push({
          fromIdentifier: file.identifier,
          module: imported.module,
          status: "external",
        });
        continue;
      }

      const target = relativeCandidates(file.source.relativePath, imported.module)
        .map((candidate) => byPath.get(candidate))
        .find(Boolean);

      if (target) {
        results.push({
          fromIdentifier: file.identifier,
          module: imported.module,
          status: "resolved",
          targetIdentifier: target.identifier,
        });
      } else {
        results.push({
          fromIdentifier: file.identifier,
          module: imported.module,
          status: "unresolved",
        });
      }
    }
  }

  return results;
}
