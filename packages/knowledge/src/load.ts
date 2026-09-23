import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { mergeKnowledgeCatalogs } from "./merge.js";
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

export async function loadKnowledgeDirectory(
  directory: string,
): Promise<KnowledgeCatalog> {
  const names = (await readdir(directory))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const catalogs = await Promise.all(
    names.map((name) => loadKnowledgeCatalog(join(directory, name))),
  );
  return mergeKnowledgeCatalogs(catalogs);
}
