import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { mergeKnowledgeCatalogs } from "./merge.js";
import type { KnowledgeCatalog } from "./types.js";
import { validateKnowledgeCatalog } from "./validate.js";

export async function loadKnowledgeCatalog(
  path: string,
): Promise<KnowledgeCatalog> {
  let parsed: KnowledgeCatalog;
  try {
    parsed = JSON.parse(await readFile(path, "utf8")) as KnowledgeCatalog;
  } catch (error) {
    throw new Error(
      `Failed to parse knowledge catalog ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const errors = validateKnowledgeCatalog(parsed);
  if (errors.length > 0) {
    throw new Error(
      `Invalid knowledge catalog ${path}: ${errors.join("; ")}`,
    );
  }
  return parsed;
}

export async function loadKnowledgeDirectory(
  directory: string,
): Promise<KnowledgeCatalog> {
  const names = (await readdir(directory))
    .filter((name) => name.endsWith(".json"))
    .sort();

  if (names.length === 0) {
    throw new Error(`No knowledge catalogs found in ${directory}`);
  }

  const catalogs: KnowledgeCatalog[] = [];
  for (const name of names) {
    catalogs.push(await loadKnowledgeCatalog(join(directory, name)));
  }

  try {
    return mergeKnowledgeCatalogs(catalogs);
  } catch (error) {
    throw new Error(
      `Failed to merge knowledge directory ${directory}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
