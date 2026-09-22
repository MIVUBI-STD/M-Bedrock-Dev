import { posix, win32 } from "node:path";

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

export type ArchivePathRejection =
  | "absolute"
  | "traversal"
  | "reserved"
  | "empty"
  | "too_deep";

export interface ArchivePathCheck {
  ok: boolean;
  normalized?: string;
  rejection?: ArchivePathRejection;
}

export function validateArchivePath(
  input: string,
  maxDepth: number,
): ArchivePathCheck {
  if (input.length === 0) return { ok: false, rejection: "empty" };

  const slashPath = input.replaceAll("\\", "/");

  if (
    slashPath.startsWith("/") ||
    win32.isAbsolute(input) ||
    /^[a-zA-Z]:\//.test(slashPath)
  ) {
    return { ok: false, rejection: "absolute" };
  }

  const parts = slashPath.split("/").filter((part) => part.length > 0);

  if (parts.some((part) => part === "..")) {
    return { ok: false, rejection: "traversal" };
  }

  if (parts.length > maxDepth) {
    return { ok: false, rejection: "too_deep" };
  }

  if (parts.some((part) => WINDOWS_RESERVED.test(part))) {
    return { ok: false, rejection: "reserved" };
  }

  const normalized = posix.normalize(parts.join("/"));
  if (normalized === "." || normalized.startsWith("../")) {
    return { ok: false, rejection: "traversal" };
  }

  return { ok: true, normalized };
}
