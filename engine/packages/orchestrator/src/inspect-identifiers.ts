import { posix } from "node:path";

export function functionIdentifier(path: string): string | undefined {
  const marker = "/functions/";
  const normalized = "/" + path.replaceAll("\\", "/");
  const index = normalized.lastIndexOf(marker);
  if (index < 0 || !normalized.endsWith(".mcfunction")) return undefined;
  return normalized.slice(index + marker.length, -".mcfunction".length);
}

export function scriptIdentifier(path: string): string | undefined {
  const marker = "/scripts/";
  const normalized = "/" + path.replaceAll("\\", "/");
  const index = normalized.lastIndexOf(marker);
  if (index < 0) return undefined;

  const relative = normalized.slice(index + marker.length);
  const extension = posix.extname(relative);
  if (![".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"].includes(extension)) {
    return undefined;
  }

  return "scripts/" + relative.slice(0, -extension.length);
}

export function structureIdentifier(path: string): string | undefined {
  const marker = "/structures/";
  const normalized = "/" + path.replaceAll("\\", "/");
  const index = normalized.lastIndexOf(marker);
  if (index < 0 || !normalized.endsWith(".mcstructure")) return undefined;

  const relative = normalized.slice(index + marker.length, -".mcstructure".length);
  const slash = relative.indexOf("/");
  if (slash < 0) return relative;

  const namespace = relative.slice(0, slash);
  const name = relative.slice(slash + 1);
  if (!namespace || !name) return undefined;

  return `${namespace}:${name}`;
}
