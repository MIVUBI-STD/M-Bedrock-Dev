import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
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

async function knowledgeFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await knowledgeFiles(path));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".json") &&
      entry.name !== "ownership.json"
    ) {
      files.push(path);
    }
  }
  return files.sort();
}

export async function loadKnowledgeDirectory(
  directory: string,
): Promise<KnowledgeCatalog> {
  const files = await knowledgeFiles(directory);
  const ownershipPath = join(directory, "ownership.json");
  if (existsSync(ownershipPath)) {
    const ownership = JSON.parse(await readFile(ownershipPath, "utf8")) as {
      schemaVersion?: number;
      groups?: Record<string, { files?: string[] }>;
    };
    if (ownership.schemaVersion !== 1 || !ownership.groups) {
      throw new Error("Invalid knowledge ownership registry: " + ownershipPath);
    }
    const declared = Object.entries(ownership.groups).flatMap(
      ([group, config]) => {
        if (!config || !Array.isArray(config.files)) {
          throw new Error("Knowledge ownership group requires files[]: " + group);
        }
        return config.files.map((name) => {
        if (
          typeof name !== "string" ||
          !name.startsWith(group + "/") ||
          name.split("/").some((part) => part === ".." || part === ".") ||
          !name.endsWith(".json")
        ) {
          throw new Error("Invalid knowledge ownership entry: " + String(name));
        }
        return join(directory, name);
        });
      },
    ).sort();
    if (
      new Set(declared).size !== declared.length ||
      declared.length !== files.length ||
      declared.some((file, index) => file !== files[index])
    ) {
      throw new Error("Knowledge directory does not match ownership.json: " + directory);
    }
  }

  if (files.length === 0) {
    throw new Error(`No knowledge catalogs found in ${directory}`);
  }

  const catalogs: KnowledgeCatalog[] = [];
  for (const path of files) {
    catalogs.push(await loadKnowledgeCatalog(path));
  }

  try {
    return mergeKnowledgeCatalogs(catalogs);
  } catch (error) {
    throw new Error(
      `Failed to merge knowledge directory ${directory}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
