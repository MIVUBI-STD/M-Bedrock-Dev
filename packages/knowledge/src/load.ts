import { readFile } from "node:fs/promises";
import type { KnowledgeCatalog } from "./types.js";
import { validateKnowledgeCatalog } from "./validate.js";

export async function loadKnowledgeCatalog(
  path: string,
): Promise<KnowledgeCatalog> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as KnowledgeCatalog;
  const errors = validateKnowledgeCatalog(parsed);
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
  return parsed;
}
