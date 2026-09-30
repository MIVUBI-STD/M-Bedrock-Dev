import { posix } from "node:path";

export type ContentKindHint =
  | "manifest"
  | "function"
  | "structure"
  | "script"
  | "json"
  | "binary"
  | "unknown";

export interface ClassifiedPath {
  relativePath: string;
  kindHint: ContentKindHint;
}

export function classifyContentPath(relativePath: string): ClassifiedPath {
  const normalized = relativePath.replaceAll("\\", "/");
  const base = posix.basename(normalized).toLowerCase();
  const ext = posix.extname(normalized).toLowerCase();

  if (base === "manifest.json") return { relativePath: normalized, kindHint: "manifest" };
  if (ext === ".mcfunction") return { relativePath: normalized, kindHint: "function" };
  if (ext === ".mcstructure") return { relativePath: normalized, kindHint: "structure" };
  if (ext === ".js" || ext === ".mjs" || ext === ".ts") {
    return { relativePath: normalized, kindHint: "script" };
  }
  if (ext === ".json") return { relativePath: normalized, kindHint: "json" };
  if (ext) return { relativePath: normalized, kindHint: "binary" };

  return { relativePath: normalized, kindHint: "unknown" };
}
